-- 22단계: 평가 장면(학생 있음/없음), 수업 계획, 수업 계획 AI 사전 검토
-- 다시 실행해도 괜찮아요.

-- 평가 장면: live 실제 수업(학생 있음) / mock 모의 시연(선배·동료가 학생 역할) / solo 혼자 연습·녹화(학생 없음)
alter table sessions add column if not exists scene text not null default 'mock';
alter table sessions drop constraint if exists sessions_scene_check;
alter table sessions add constraint sessions_scene_check check (scene in ('live', 'mock', 'solo'));

-- 수업 계획: 멘토가 설계한 순서와 시간 (예: 도입·목표 3분 → 학과 10분 → 진로 10분 → 질문·정리 7분)
alter table sessions add column if not exists lesson_plan text;

-- 장면·계획 수정: 관리하는 사람과 평가받는 본인
create or replace function set_session_context(p_session uuid, p_scene text, p_plan text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not can_ai_session(p_session) then
    raise exception '이 수업의 정보를 바꿀 권한이 없어요.';
  end if;
  update sessions
     set scene = coalesce(nullif(p_scene, ''), scene),
         lesson_plan = nullif(trim(p_plan), '')
   where id = p_session;
end $$;
revoke all on function set_session_context(uuid, text, text) from public;
grant execute on function set_session_context(uuid, text, text) to authenticated;

-- 링크 평가자(비로그인)도 장면을 알아야 학생 관련 항목을 빼고 평가해요
drop function if exists get_evaluation_session(uuid);
create function get_evaluation_session(p_id uuid)
returns table (session_no bigint, mentor_name text, major text, rubric_type text,
               audience_level text, audience_note text, audience_size int, scene text)
language sql security definer set search_path = public stable
as $$
  select s.session_no, s.mentor_name, s.major, s.rubric_type,
         s.audience_level, s.audience_note, s.audience_size, s.scene
  from sessions s where s.id = p_id and s.deleted_at is null
$$;
revoke all on function get_evaluation_session(uuid) from public;
grant execute on function get_evaluation_session(uuid) to anon, authenticated;

-- 피드백 링크 화면용: 장면만 따로 알려 줘요
create or replace function get_feedback_scene(p_token uuid)
returns text
language sql security definer set search_path = public stable
as $$
  select s.scene from sessions s where s.feedback_token = p_token and s.deleted_at is null
$$;
revoke all on function get_feedback_scene(uuid) from public;
grant execute on function get_feedback_scene(uuid) to anon, authenticated;

-- 수업 계획 AI 사전 검토 기록
create table if not exists plan_reviews (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  plan text not null,
  result jsonb not null,   -- { verdict, checks: [{aspect, status, comment}], suggested_plan, tips }
  model text not null,
  prompt_version text not null,
  usage jsonb,
  created_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table plan_reviews enable row level security;

drop policy if exists "계획 검토 조회" on plan_reviews;
create policy "계획 검토 조회" on plan_reviews for select to authenticated
  using (created_by = auth.uid() or can_ai_session(session_id));
drop policy if exists "계획 검토 저장" on plan_reviews;
create policy "계획 검토 저장" on plan_reviews for insert to authenticated
  with check (can_ai_session(session_id) and created_by = auth.uid());

notify pgrst, 'reload schema';
