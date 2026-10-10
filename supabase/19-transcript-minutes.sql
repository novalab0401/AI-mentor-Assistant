-- 19단계: 전사문에 계획 시간·실제 수업 시간(분) 기록
-- AI는 전사문 길이만으로 수업 시간을 알 수 없어서, 시간 관리 채점의 근거로 써요.
-- 다시 실행해도 괜찮아요.

alter table transcripts add column if not exists planned_minutes int check (planned_minutes between 1 and 600);
alter table transcripts add column if not exists actual_minutes int check (actual_minutes between 1 and 600);

notify pgrst, 'reload schema';
