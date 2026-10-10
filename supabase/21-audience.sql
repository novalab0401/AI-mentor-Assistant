-- 21단계: 수업 대상(학년·인원·계열/사전지식) 기록
-- 평가자와 AI가 "설명·용어 수준이 대상에게 맞았나"를 판단하는 기준이에요.
-- 다시 실행해도 괜찮아요.

alter table sessions add column if not exists audience_level text;
alter table sessions add column if not exists audience_note text;
alter table sessions add column if not exists audience_size int check (audience_size between 1 and 1000);

-- 대상 수정: 관리하는 사람(운영진·팀장)과 평가받는 본인(셀프 연습)이 할 수 있어요
create or replace function set_session_audience(p_session uuid, p_level text, p_note text, p_size int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not can_ai_session(p_session) then
    raise exception '이 수업의 대상을 바꿀 권한이 없어요.';
  end if;
  update sessions
     set audience_level = nullif(trim(p_level), ''),
         audience_note = nullif(trim(p_note), ''),
         audience_size = p_size
   where id = p_session;
end $$;
revoke all on function set_session_audience(uuid, text, text, int) from public;
grant execute on function set_session_audience(uuid, text, text, int) to authenticated;

-- 링크 평가자(비로그인)도 대상을 보고 평가하도록
drop function if exists get_evaluation_session(uuid);
create function get_evaluation_session(p_id uuid)
returns table (session_no bigint, mentor_name text, major text, rubric_type text,
               audience_level text, audience_note text, audience_size int)
language sql security definer set search_path = public stable
as $$
  select s.session_no, s.mentor_name, s.major, s.rubric_type,
         s.audience_level, s.audience_note, s.audience_size
  from sessions s where s.id = p_id and s.deleted_at is null
$$;
revoke all on function get_evaluation_session(uuid) from public;
grant execute on function get_evaluation_session(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
