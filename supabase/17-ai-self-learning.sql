-- 17단계: AI 평가는 본인이 스스로 보고 배우는 도구 — 공개 스위치 없이 본인에게 항상 보여요
-- 16단계 다음에 실행하세요. 다시 실행해도 괜찮아요.

-- AI 결과를 볼 수 있는 사람: 평가받는 본인(항상), 실행한 사람, 관리하는 사람(검증용)
create or replace function can_view_ai_run(rid bigint) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from ai_runs r join sessions s on s.id = r.session_id
    where r.id = rid
      and (s.presenter_id = auth.uid()
           or r.created_by = auth.uid()
           or can_manage_session(s.id))
  )
$$;

-- 피드백 링크: 사람 평가는 운영진이 공개해야 보이고, AI 평가는 결과가 있으면 바로 보여요
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

  select * into latest_run from ai_runs where session_id = s.id order by created_at desc limit 1;

  if not s.feedback_open and latest_run.id is null then
    return jsonb_build_object('open', false, 'mentor_name', s.mentor_name);
  end if;

  return jsonb_build_object(
    'open', true,
    'human_open', s.feedback_open,
    'ai_open', latest_run.id is not null,
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
    'ai', case when latest_run.id is not null then jsonb_build_object(
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

-- 내가 받은 평가: 사람 평가가 공개됐거나 AI 결과가 있으면 결과 링크를 줘요
drop function if exists my_feedback_list();
create function my_feedback_list()
returns table (session_id uuid, session_no bigint, session_date date, mentor_name text, major text,
               rubric_type text, group_name text, team_name text,
               feedback_open boolean, ai_open boolean, feedback_token uuid, evaluator_count bigint,
               ai_run_count bigint)
language sql security definer set search_path = public stable as $$
  select s.id, s.session_no, s.session_date, s.mentor_name, s.major, s.rubric_type,
         g.name, t.name, s.feedback_open,
         exists (select 1 from ai_runs r where r.session_id = s.id),
         case when s.feedback_open or exists (select 1 from ai_runs r where r.session_id = s.id)
              then s.feedback_token end,
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
