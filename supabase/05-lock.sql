-- 5단계: 운영자 로그인 + 잠금
-- Supabase SQL Editor에서 New query로 실행하세요. 다시 실행해도 괜찮아요.

-- 1) 개발용으로 열어 둔 임시 규칙 모두 삭제
drop policy if exists "임시: 누구나 저장만 가능" on evaluations;
drop policy if exists "임시: 누구나 점수 조회" on evaluations;
drop policy if exists "임시: 누구나 점수 수정" on evaluations;
drop policy if exists "임시: 누구나 점수 삭제" on evaluations;
drop policy if exists "임시: 누구나 시연 조회" on sessions;
drop policy if exists "임시: 누구나 시연 생성" on sessions;
drop policy if exists "임시: 누구나 시연 수정" on sessions;
drop policy if exists "임시: 누구나 시연 삭제" on sessions;

-- 2) 운영자(로그인한 사람): 모든 권한
drop policy if exists "운영자 전체 권한" on sessions;
create policy "운영자 전체 권한" on sessions
  for all to authenticated using (true) with check (true);
drop policy if exists "운영자 전체 권한" on evaluations;
create policy "운영자 전체 권한" on evaluations
  for all to authenticated using (true) with check (true);

-- 3) 평가하는 선배(로그인 없음): 점수 "제출"만 가능. 조회·수정·삭제 불가
drop policy if exists "평가자 제출만" on evaluations;
create policy "평가자 제출만" on evaluations
  for insert to anon with check (true);

-- 4) 선배가 링크로 들어왔을 때 "그 시연 하나"의 이름·전공만 알려 주는 함수
--    (시연 표 전체는 못 보게 하고, 링크 번호를 아는 시연만 보여 줘요)
create or replace function get_evaluation_session(p_id uuid)
returns table (session_no bigint, mentor_name text, major text)
language sql
security definer
set search_path = public
stable
as $$
  select s.session_no, s.mentor_name, s.major
  from sessions s
  where s.id = p_id
$$;
revoke all on function get_evaluation_session(uuid) from public;
grant execute on function get_evaluation_session(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
