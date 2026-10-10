-- 7단계: 수업마다 평가지(템플릿) 고르기
-- 06번(score 빈 값 허용)도 같이 들어 있어요. 다시 실행해도 괜찮아요.

alter table evaluations alter column score drop not null;

alter table sessions
  add column if not exists rubric_type text not null default 'mentor_mock';

alter table sessions drop constraint if exists sessions_rubric_type_check;
alter table sessions add constraint sessions_rubric_type_check
  check (rubric_type in ('mentor_mock', 'stem_mock', 'stem_live'));

-- 평가 링크로 들어온 사람에게 "어떤 평가지인지"도 알려 줘야 해서 함수를 다시 만들어요
-- (돌려주는 칸이 바뀌면 함수를 지우고 새로 만들어야 해요)
drop function if exists get_evaluation_session(uuid);
create function get_evaluation_session(p_id uuid)
returns table (session_no bigint, mentor_name text, major text, rubric_type text)
language sql security definer set search_path = public stable
as $$
  select s.session_no, s.mentor_name, s.major, s.rubric_type
  from sessions s where s.id = p_id
$$;
revoke all on function get_evaluation_session(uuid) from public;
grant execute on function get_evaluation_session(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
