-- 20단계: AI 채점 결과 저장 오류(new row violates row-level security policy for table "ai_runs") 수정
-- 원인: 저장 직후 결과 번호를 돌려받을 때 "볼 수 있나" 검사가 표를 다시 조회하는데,
--       방금 넣은 줄은 그 조회에 아직 안 보여서 "못 본다"로 판정됐어요.
-- 해결: 다시 조회하지 않고 그 줄의 값(실행한 사람, 수업)으로 바로 판단해요. 볼 수 있는 사람은 같아요.
-- 다시 실행해도 괜찮아요.

drop policy if exists "관리자 AI 실행 조회" on ai_runs;
create policy "관리자 AI 실행 조회" on ai_runs for select to authenticated
  using (created_by = auth.uid() or can_ai_session(session_id));

notify pgrst, 'reload schema';
