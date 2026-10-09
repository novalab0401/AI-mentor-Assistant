-- 10단계: 그룹 안의 팀
-- 9단계를 먼저 실행해야 해요. 다시 실행해도 괜찮아요.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
alter table teams enable row level security;

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  is_leader boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table team_members enable row level security;

-- 도우미 함수
create or replace function team_group(tid uuid) returns uuid
language sql security definer set search_path = public stable as $$
  select group_id from teams where id = tid
$$;
create or replace function is_team_leader(tid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from team_members
                 where team_id = tid and user_id = auth.uid() and status = 'active' and is_leader)
$$;
-- 팀 관리: 그룹 운영진 또는 그 팀의 팀장
create or replace function can_manage_team(tid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select is_group_admin(team_group(tid)) or is_team_leader(tid)
$$;
create or replace function is_active_in_group(uid uuid, gid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from group_members
                 where group_id = gid and user_id = uid and status = 'active')
$$;

-- 팀 규칙
drop policy if exists "그룹 멤버 팀 조회" on teams;
create policy "그룹 멤버 팀 조회" on teams for select to authenticated
  using (is_group_member(group_id));
drop policy if exists "운영진 팀 만들기" on teams;
create policy "운영진 팀 만들기" on teams for insert to authenticated
  with check (is_group_admin(group_id));
drop policy if exists "팀 수정" on teams;
create policy "팀 수정" on teams for update to authenticated
  using (can_manage_team(id)) with check (can_manage_team(id));
drop policy if exists "운영진 팀 삭제" on teams;
create policy "운영진 팀 삭제" on teams for delete to authenticated
  using (is_group_admin(group_id));

-- 팀 멤버 규칙
drop policy if exists "그룹 멤버 팀원 조회" on team_members;
create policy "그룹 멤버 팀원 조회" on team_members for select to authenticated
  using (is_group_member(team_group(team_id)));
drop policy if exists "팀 신청 또는 팀원 추가" on team_members;
create policy "팀 신청 또는 팀원 추가" on team_members for insert to authenticated
  with check (
    is_active_in_group(user_id, team_group(team_id))
    and (
      -- 본인이 신청 (승인 대기, 팀장 아님)
      (user_id = auth.uid() and status = 'pending' and not is_leader)
      -- 운영진·팀장이 바로 추가
      or can_manage_team(team_id)
    )
  );
drop policy if exists "팀 승인·팀장 지정" on team_members;
create policy "팀 승인·팀장 지정" on team_members for update to authenticated
  using (can_manage_team(team_id)) with check (can_manage_team(team_id));
drop policy if exists "팀 나가기 또는 내보내기" on team_members;
create policy "팀 나가기 또는 내보내기" on team_members for delete to authenticated
  using (user_id = auth.uid() or can_manage_team(team_id));

-- 그룹에서 나가면 그 그룹의 팀에서도 빠지기
create or replace function leave_group_teams() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from team_members
  where user_id = old.user_id
    and team_id in (select id from teams where group_id = old.group_id);
  return old;
end $$;
drop trigger if exists leave_group_teams on group_members;
create trigger leave_group_teams after delete on group_members
  for each row execute function leave_group_teams();

-- 수업(시연)을 팀에 연결 (팀 없이도 가능)
alter table sessions add column if not exists team_id uuid references teams(id) on delete set null;

create or replace function session_team(sid uuid) returns uuid
language sql security definer set search_path = public stable as $$
  select team_id from sessions where id = sid
$$;
-- 수업 관리: 그룹 운영진 또는 그 수업 팀의 팀장
create or replace function can_manage_session(sid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select is_group_admin(session_group(sid))
      or coalesce(is_team_leader(session_team(sid)), false)
$$;

drop policy if exists "운영진 시연 등록" on sessions;
create policy "운영진 시연 등록" on sessions for insert to authenticated
  with check (
    is_group_admin(group_id)
    or (team_id is not null and is_team_leader(team_id) and team_group(team_id) = group_id)
  );
drop policy if exists "운영진 시연 수정" on sessions;
create policy "운영진 시연 수정" on sessions for update to authenticated
  using (is_group_admin(group_id) or (team_id is not null and is_team_leader(team_id)))
  with check (
    is_group_admin(group_id)
    or (team_id is not null and is_team_leader(team_id) and team_group(team_id) = group_id)
  );
drop policy if exists "운영진 시연 삭제" on sessions;
create policy "운영진 시연 삭제" on sessions for delete to authenticated
  using (is_group_admin(group_id) or (team_id is not null and is_team_leader(team_id)));

-- 평가 결과: 그룹 운영진 + 그 팀 팀장
drop policy if exists "운영진 평가 조회" on evaluations;
create policy "운영진 평가 조회" on evaluations for select to authenticated
  using (can_manage_session(session_id));
drop policy if exists "운영진 평가 수정" on evaluations;
create policy "운영진 평가 수정" on evaluations for update to authenticated
  using (can_manage_session(session_id)) with check (can_manage_session(session_id));
drop policy if exists "운영진 평가 삭제" on evaluations;
create policy "운영진 평가 삭제" on evaluations for delete to authenticated
  using (can_manage_session(session_id));

notify pgrst, 'reload schema';
