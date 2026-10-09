-- 8단계: 멘토(평가받는 사람)가 자기 피드백을 보는 링크
-- 다시 실행해도 괜찮아요.

-- 시연마다 "피드백 전용 비밀 번호"와 "공개 여부"
alter table sessions
  add column if not exists feedback_token uuid not null default gen_random_uuid();
alter table sessions
  add column if not exists feedback_open boolean not null default false;
create unique index if not exists sessions_feedback_token_key on sessions(feedback_token);

-- 피드백 링크로 들어온 멘토에게 결과를 돌려주는 함수
--  - 운영자가 공개하기 전에는 내용을 주지 않아요
--  - 평가자 이름은 DB 밖으로 내보내지 않고 번호(1, 2, 3...)로 바꿔요
create or replace function get_feedback(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  s sessions%rowtype;
begin
  select * into s from sessions where feedback_token = p_token;
  if not found then
    return null;
  end if;

  if not s.feedback_open then
    return jsonb_build_object('open', false, 'mentor_name', s.mentor_name);
  end if;

  return jsonb_build_object(
    'open', true,
    'session_no', s.session_no,
    'mentor_name', s.mentor_name,
    'major', s.major,
    'session_date', s.session_date,
    'rubric_type', s.rubric_type,
    'evaluations', coalesce((
      select jsonb_agg(
        jsonb_build_object('evaluator', x.n, 'item_id', x.item_id, 'score', x.score, 'memo', x.memo)
        order by x.n, x.id)
      from (
        select e.id, e.item_id, e.score, e.memo,
               dense_rank() over (order by f.first_at, e.evaluator_name) as n
        from evaluations e
        join (
          select evaluator_name, min(created_at) as first_at
          from evaluations where session_id = s.id
          group by evaluator_name
        ) f on f.evaluator_name = e.evaluator_name
        where e.session_id = s.id
      ) x
    ), '[]'::jsonb)
  );
end
$$;
revoke all on function get_feedback(uuid) from public;
grant execute on function get_feedback(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
