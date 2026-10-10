-- 16단계: 멘토 셀프 AI 평가 + AI 결과 공유
-- 15단계 다음에 실행하세요. 다시 실행해도 괜찮아요.

-- 운영진이 돌린 AI 결과를 멘토에게 보여 줄지 (사람 평가 공개와 따로)
alter table sessions add column if not exists ai_open boolean not null default false;

-- 이 수업에서 AI 평가를 할 수 있는 사람: 관리하는 사람 + 평가받는 본인
create or replace function can_ai_session(sid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select can_manage_session(sid)
      or exists (select 1 from sessions where id = sid and presenter_id = auth.uid() and deleted_at is null)
$$;

-- AI 실행 결과를 볼 수 있는 사람:
--  관리하는 사람 / 그 실행을 직접 한 사람 / 공개된 경우 평가받는 본인
create or replace function can_view_ai_run(rid bigint) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from ai_runs r join sessions s on s.id = r.session_id
    where r.id = rid
      and (can_manage_session(s.id)
           or r.created_by = auth.uid()
           or (s.presenter_id = auth.uid() and s.ai_open))
  )
$$;

-- 전사문: 관리하는 사람과 본인이 보고 올릴 수 있어요
drop policy if exists "관리자 전사문 조회" on transcripts;
create policy "관리자 전사문 조회" on transcripts for select to authenticated
  using (can_ai_session(session_id));
drop policy if exists "관리자 전사문 저장" on transcripts;
create policy "관리자 전사문 저장" on transcripts for insert to authenticated
  with check (can_ai_session(session_id));

drop policy if exists "관리자 AI 실행 조회" on ai_runs;
create policy "관리자 AI 실행 조회" on ai_runs for select to authenticated
  using (can_view_ai_run(id));
drop policy if exists "관리자 AI 실행 저장" on ai_runs;
create policy "관리자 AI 실행 저장" on ai_runs for insert to authenticated
  with check (can_ai_session(session_id) and created_by = auth.uid());

drop policy if exists "관리자 AI 점수 조회" on ai_scores;
create policy "관리자 AI 점수 조회" on ai_scores for select to authenticated
  using (can_view_ai_run(run_id));
drop policy if exists "관리자 AI 점수 저장" on ai_scores;
create policy "관리자 AI 점수 저장" on ai_scores for insert to authenticated
  with check (can_view_ai_run(run_id));

-- 셀프 연습: 그룹 멤버는 자기 자신을 발표자로 하는 수업을 직접 만들 수 있어요
drop policy if exists "운영진 시연 등록" on sessions;
create policy "운영진 시연 등록" on sessions for insert to authenticated
  with check (
    (
      is_group_admin(group_id)
      or (team_id is not null and is_team_leader(team_id) and team_group(team_id) = group_id)
      or (presenter_id = auth.uid() and is_active_in_group(auth.uid(), group_id)
          and (team_id is null or team_group(team_id) = group_id))
    )
    and (presenter_id is null or is_active_in_group(presenter_id, group_id))
  );

-- 피드백 링크: 사람 평가 공개 / AI 공개를 따로 반영
create or replace function get_feedback(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public stable
as $$
declare
  s sessions%rowtype;
  latest_run ai_runs%rowtype;
begin
  select * into s from sessions where feedback_token = p_token and deleted_at is null;
  if not found then
    return null;
  end if;
  if not s.feedback_open and not s.ai_open then
    return jsonb_build_object('open', false, 'mentor_name', s.mentor_name);
  end if;

  select * into latest_run from ai_runs where session_id = s.id order by created_at desc limit 1;

  return jsonb_build_object(
    'open', true,
    'human_open', s.feedback_open,
    'ai_open', s.ai_open and latest_run.id is not null,
    'session_no', s.session_no,
    'mentor_name', s.mentor_name,
    'major', s.major,
    'session_date', s.session_date,
    'rubric_type', s.rubric_type,
    'evaluations', case when s.feedback_open then coalesce((
      select jsonb_agg(
        jsonb_build_object('evaluator', x.n, 'item_id', x.item_id, 'score', x.score, 'memo', x.memo)
        order by x.n, x.id)
      from (
        select e.id, e.item_id, e.score, e.memo,
               dense_rank() over (order by f.first_at, e.evaluator_name) as n
        from evaluations e
        join (
          select evaluator_name, min(created_at) as first_at
          from evaluations where session_id = s.id and deleted_at is null
          group by evaluator_name
        ) f on f.evaluator_name = e.evaluator_name
        where e.session_id = s.id and e.deleted_at is null
      ) x
    ), '[]'::jsonb) else '[]'::jsonb end,
    'ai', case when s.ai_open and latest_run.id is not null then jsonb_build_object(
      'created_at', latest_run.created_at,
      'summary', latest_run.summary,
      'scores', coalesce((
        select jsonb_agg(jsonb_build_object(
          'item_id', a.item_id, 'score', a.score, 'evidence', a.evidence,
          'rationale', a.rationale, 'next_action', a.next_action))
        from ai_scores a where a.run_id = latest_run.id
      ), '[]'::jsonb)
    ) else null end
  );
end
$$;

-- 내가 받은 평가: 사람 또는 AI 중 하나라도 공개되면 링크를 줘요
drop function if exists my_feedback_list();
create function my_feedback_list()
returns table (session_id uuid, session_no bigint, session_date date, mentor_name text, major text,
               rubric_type text, group_name text, team_name text,
               feedback_open boolean, ai_open boolean, feedback_token uuid, evaluator_count bigint,
               ai_run_count bigint)
language sql security definer set search_path = public stable as $$
  select s.id, s.session_no, s.session_date, s.mentor_name, s.major, s.rubric_type,
         g.name, t.name, s.feedback_open, s.ai_open,
         case when s.feedback_open or s.ai_open then s.feedback_token end,
         (select count(distinct e.evaluator_name) from evaluations e
          where e.session_id = s.id and e.deleted_at is null),
         (select count(*) from ai_runs r where r.session_id = s.id)
  from sessions s
  join groups g on g.id = s.group_id
  left join teams t on t.id = s.team_id
  where s.presenter_id = auth.uid() and s.deleted_at is null
  order by s.session_date desc, s.session_no desc
$$;
revoke all on function my_feedback_list() from public;
grant execute on function my_feedback_list() to authenticated;

notify pgrst, 'reload schema';
