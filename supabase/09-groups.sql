-- 9단계: 계정·그룹(밴드)·역할·가입 승인
-- 다시 실행해도 괜찮게 만들었어요.

------------------------------------------------------------
-- 1) 프로필: 회원마다 이름
------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

drop policy if exists "로그인 사용자 프로필 조회" on profiles;
create policy "로그인 사용자 프로필 조회" on profiles
  for select to authenticated using (true);
drop policy if exists "본인 프로필 수정" on profiles;
create policy "본인 프로필 수정" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 회원가입하면 프로필 자동 생성
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
                           split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- 이미 있는 계정(재호님)도 프로필 만들기
insert into profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

------------------------------------------------------------
-- 2) 그룹과 멤버
------------------------------------------------------------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  created_by uuid references profiles(id) on delete set null default auth.uid()
);
alter table groups enable row level security;

-- role: admin(운영진) / evaluator(선배·평가자) / mentor(멘토) / trainee(예비 멘토)
-- status: pending(승인 대기) / active(활동 중)
create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'trainee'
    check (role in ('admin', 'evaluator', 'mentor', 'trainee')),
  status text not null default 'pending'
    check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table group_members enable row level security;

-- 보안 규칙에서 쓰는 도우미 함수
create or replace function is_group_member(gid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from group_members
                 where group_id = gid and user_id = auth.uid() and status = 'active')
$$;
create or replace function is_group_admin(gid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from group_members
                 where group_id = gid and user_id = auth.uid()
                   and status = 'active' and role = 'admin')
$$;

-- 그룹을 만든 사람은 자동으로 운영진
create or replace function add_group_creator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into group_members (group_id, user_id, role, status)
    values (new.id, auth.uid(), 'admin', 'active')
    on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_group_created on groups;
create trigger on_group_created after insert on groups
  for each row execute function add_group_creator();

-- 운영진이 0명이 되는 변경(마지막 운영진의 탈퇴·강등)을 막기
create or replace function keep_one_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.status <> 'active')
     and exists (select 1 from groups where id = old.group_id)  -- 그룹 자체 삭제는 허용
     and not exists (select 1 from group_members
                     where group_id = old.group_id and user_id <> old.user_id
                       and role = 'admin' and status = 'active')
  then
    raise exception '그룹에는 운영진이 최소 1명 있어야 해요. 다른 사람을 먼저 운영진으로 지정해 주세요.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists keep_one_admin on group_members;
create trigger keep_one_admin before update or delete on group_members
  for each row execute function keep_one_admin();

-- 그룹 규칙
drop policy if exists "그룹 목록 조회" on groups;
create policy "그룹 목록 조회" on groups for select to authenticated using (true);
-- 그룹 만들기는 Nova Lab이 권한(개수)을 준 사람만 (아래 4번 참고)
drop policy if exists "그룹 만들기" on groups;
drop policy if exists "운영진 그룹 수정" on groups;
create policy "운영진 그룹 수정" on groups for update to authenticated
  using (is_group_admin(id)) with check (is_group_admin(id));
drop policy if exists "운영진 그룹 삭제" on groups;
create policy "운영진 그룹 삭제" on groups for delete to authenticated using (is_group_admin(id));

-- 멤버 규칙
drop policy if exists "멤버 조회" on group_members;
create policy "멤버 조회" on group_members for select to authenticated
  using (user_id = auth.uid() or is_group_member(group_id));
drop policy if exists "가입 신청" on group_members;
create policy "가입 신청" on group_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'trainee' and status = 'pending');
drop policy if exists "운영진 승인·역할 변경" on group_members;
create policy "운영진 승인·역할 변경" on group_members for update to authenticated
  using (is_group_admin(group_id)) with check (is_group_admin(group_id));
drop policy if exists "탈퇴 또는 운영진 내보내기" on group_members;
create policy "탈퇴 또는 운영진 내보내기" on group_members for delete to authenticated
  using (user_id = auth.uid() or is_group_admin(group_id));

-- 그룹 찾기 화면용: 멤버 수와 내 상태까지 한 번에
create or replace function list_groups()
returns table (id uuid, name text, description text, created_at timestamptz,
               member_count bigint, my_status text, my_role text)
language sql security definer set search_path = public stable as $$
  select g.id, g.name, g.description, g.created_at,
         (select count(*) from group_members m where m.group_id = g.id and m.status = 'active'),
         me.status, me.role
  from groups g
  left join group_members me on me.group_id = g.id and me.user_id = auth.uid()
  order by g.created_at desc
$$;
revoke all on function list_groups() from public;
grant execute on function list_groups() to authenticated;

------------------------------------------------------------
-- 3) 시연을 그룹에 소속시키기
------------------------------------------------------------
alter table sessions add column if not exists group_id uuid references groups(id) on delete cascade;

-- 지금까지 만든 시연은 "Nova Lab 테스트" 그룹으로 옮기고, 기존 계정을 운영진으로
do $$
declare gid uuid;
begin
  if exists (select 1 from sessions where group_id is null) then
    insert into groups (name, description, created_by)
    values ('Nova Lab 테스트', '그룹 기능 이전에 만든 시연', null)
    returning id into gid;
    insert into group_members (group_id, user_id, role, status)
    select gid, id, 'admin', 'active' from profiles
    on conflict do nothing;
    update sessions set group_id = gid where group_id is null;
  end if;
end $$;
alter table sessions alter column group_id set not null;

create or replace function session_group(sid uuid) returns uuid
language sql security definer set search_path = public stable as $$
  select group_id from sessions where id = sid
$$;

-- 이전 규칙("로그인한 사람 = 운영자") 정리
drop policy if exists "운영자 전체 권한" on sessions;
drop policy if exists "운영자 전체 권한" on evaluations;

-- 시연: 그룹 멤버는 보기, 운영진은 등록·수정·삭제
drop policy if exists "그룹 멤버 시연 조회" on sessions;
create policy "그룹 멤버 시연 조회" on sessions for select to authenticated
  using (is_group_member(group_id));
drop policy if exists "운영진 시연 등록" on sessions;
create policy "운영진 시연 등록" on sessions for insert to authenticated
  with check (is_group_admin(group_id));
drop policy if exists "운영진 시연 수정" on sessions;
create policy "운영진 시연 수정" on sessions for update to authenticated
  using (is_group_admin(group_id)) with check (is_group_admin(group_id));
drop policy if exists "운영진 시연 삭제" on sessions;
create policy "운영진 시연 삭제" on sessions for delete to authenticated
  using (is_group_admin(group_id));

-- 평가: 제출은 링크로 누구나(로그인 여부 상관없이), 보기·수정·삭제는 그 그룹 운영진만
drop policy if exists "로그인 사용자 평가 제출" on evaluations;
create policy "로그인 사용자 평가 제출" on evaluations for insert to authenticated
  with check (true);
drop policy if exists "운영진 평가 조회" on evaluations;
create policy "운영진 평가 조회" on evaluations for select to authenticated
  using (is_group_admin(session_group(session_id)));
drop policy if exists "운영진 평가 수정" on evaluations;
create policy "운영진 평가 수정" on evaluations for update to authenticated
  using (is_group_admin(session_group(session_id)))
  with check (is_group_admin(session_group(session_id)));
drop policy if exists "운영진 평가 삭제" on evaluations;
create policy "운영진 평가 삭제" on evaluations for delete to authenticated
  using (is_group_admin(session_group(session_id)));

------------------------------------------------------------
-- 4) Nova Lab 관리자와 그룹 만들기 권한 (구독)
------------------------------------------------------------
-- is_platform_admin: Nova Lab 관리자 (권한을 나눠 주는 사람)
-- group_quota: 이 사람이 만들 수 있는 그룹 수 (구독한 단체의 대표에게 부여)
alter table profiles add column if not exists is_platform_admin boolean not null default false;
alter table profiles add column if not exists group_quota int not null default 0;

-- 본인이 바꿀 수 있는 건 이름뿐 (권한·개수는 못 바꾸게)
revoke update on profiles from authenticated;
grant update (display_name) on profiles to authenticated;

-- 첫 Nova Lab 관리자: 지금 있는 계정(재호님)
update profiles set is_platform_admin = true
where id in (select id from auth.users order by created_at limit 1);

create or replace function can_create_group() returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((
    select p.is_platform_admin
        or p.group_quota > (select count(*) from groups g where g.created_by = p.id)
    from profiles p where p.id = auth.uid()
  ), false)
$$;

create policy "그룹 만들기" on groups for insert to authenticated
  with check (created_by = auth.uid() and can_create_group());

-- 내 권한 확인 (화면에서 "새 그룹" 버튼을 보여 줄지 정할 때)
create or replace function my_permissions()
returns table (is_platform_admin boolean, group_quota int, groups_created bigint)
language sql security definer set search_path = public stable as $$
  select p.is_platform_admin, p.group_quota,
         (select count(*) from groups g where g.created_by = p.id)
  from profiles p where p.id = auth.uid()
$$;
revoke all on function my_permissions() from public;
grant execute on function my_permissions() to authenticated;

-- Nova Lab 관리자 화면: 회원 목록 (이메일 포함)
create or replace function admin_list_users()
returns table (id uuid, email text, display_name text, is_platform_admin boolean,
               group_quota int, groups_created bigint, created_at timestamptz)
language plpgsql security definer set search_path = public stable as $$
begin
  if not exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_platform_admin) then
    raise exception 'Nova Lab 관리자만 볼 수 있어요.';
  end if;
  return query
    select p.id, u.email::text, p.display_name, p.is_platform_admin, p.group_quota,
           (select count(*) from groups g where g.created_by = p.id), p.created_at
    from profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;
revoke all on function admin_list_users() from public;
grant execute on function admin_list_users() to authenticated;

-- Nova Lab 관리자 화면: 그룹 만들기 개수 정하기
create or replace function admin_set_quota(p_user uuid, p_quota int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_platform_admin) then
    raise exception 'Nova Lab 관리자만 바꿀 수 있어요.';
  end if;
  update profiles set group_quota = greatest(p_quota, 0) where id = p_user;
end $$;
revoke all on function admin_set_quota(uuid, int) from public;
grant execute on function admin_set_quota(uuid, int) to authenticated;

notify pgrst, 'reload schema';
