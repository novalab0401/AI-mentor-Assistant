-- 15단계: AI 채점 1차 (전사문 → Claude 채점 → 사람 점수와 비교)
-- 14단계 다음에 실행하세요. 다시 실행해도 괜찮아요.

-- 전사문: 수업 녹음을 글로 옮긴 것 (지금은 붙여넣기, 다음 단계에서 자동 전사)
create table if not exists transcripts (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  source text not null default 'paste' check (source in ('paste', 'stt')),
  content text not null,
  created_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table transcripts enable row level security;

-- AI 채점 실행 1회 = ai_runs 1줄, 항목별 결과 = ai_scores 여러 줄
create table if not exists ai_runs (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  transcript_id bigint references transcripts(id) on delete set null,
  rubric_type text not null,
  model text not null,
  prompt_version text not null,
  summary jsonb,          -- { strengths: [], improvements: [] }
  usage jsonb,            -- 토큰 사용량 (비용 계산용)
  created_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table ai_runs enable row level security;

create table if not exists ai_scores (
  id bigint generated always as identity primary key,
  run_id bigint not null references ai_runs(id) on delete cascade,
  item_id text not null,
  score int check (score between 1 and 4),   -- 비어 있으면 전사문만으로 판단 불가
  evidence jsonb not null default '[]',      -- [{ quote, verified }]
  rationale text,
  next_action text
);
alter table ai_scores enable row level security;

create or replace function run_session(rid bigint) returns uuid
language sql security definer set search_path = public stable as $$
  select session_id from ai_runs where id = rid
$$;

-- 보기·저장: 그 수업을 관리하는 사람(그룹 운영진, 그 팀 팀장, Nova Lab)만
-- AI 결과는 사람 평가와 일치가 확인되기 전까지 멘토에게 보여 주지 않아요
drop policy if exists "관리자 전사문 조회" on transcripts;
create policy "관리자 전사문 조회" on transcripts for select to authenticated
  using (can_manage_session(session_id));
drop policy if exists "관리자 전사문 저장" on transcripts;
create policy "관리자 전사문 저장" on transcripts for insert to authenticated
  with check (can_manage_session(session_id));

drop policy if exists "관리자 AI 실행 조회" on ai_runs;
create policy "관리자 AI 실행 조회" on ai_runs for select to authenticated
  using (can_manage_session(session_id));
drop policy if exists "관리자 AI 실행 저장" on ai_runs;
create policy "관리자 AI 실행 저장" on ai_runs for insert to authenticated
  with check (can_manage_session(session_id));

drop policy if exists "관리자 AI 점수 조회" on ai_scores;
create policy "관리자 AI 점수 조회" on ai_scores for select to authenticated
  using (can_manage_session(run_session(run_id)));
drop policy if exists "관리자 AI 점수 저장" on ai_scores;
create policy "관리자 AI 점수 저장" on ai_scores for insert to authenticated
  with check (can_manage_session(run_session(run_id)));

notify pgrst, 'reload schema';
