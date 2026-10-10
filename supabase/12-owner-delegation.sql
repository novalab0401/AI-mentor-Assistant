-- 12단계: 그룹장 위임, 초대, 삭제 요청, Nova Lab 관리 기능
-- 9·10·11단계 다음에 실행하세요. 다시 실행해도 괜찮아요.

------------------------------------------------------------
-- 1) Nova Lab 관리자는 모든 그룹에서 운영진 권한
------------------------------------------------------------
create or replace function is_group_member(gid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select is_platform_admin() or exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and status = 'active')
$$;
create or replace function is_group_admin(gid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select is_platform_admin() or exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and status = 'active' and role = 'admin')
$$;

------------------------------------------------------------
-- 2) 그룹장 보호: 그룹장은 Nova Lab만 바꾸거나 내보낼 수 있음
--    + 운영진 0명 방지 (기존 규칙 유지)
------------------------------------------------------------
create or replace function keep_one_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- 그룹 자체가 지워지는 중이면 통과
  if not exists (select 1 from groups where id = old.group_id) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if old.role = 'admin' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.status <> 'active') then

    if exists (select 1 from groups where id = old.group_id and created_by = old.user_id)
       and not is_platform_admin() then
      raise exception '그룹장은 Nova Lab에서만 바꾸거나 내보낼 수 있어요.';
    end if;

    if not exists (select 1 from group_members
                   where group_id = old.group_id and user_id <> old.user_id
                     and role = 'admin' and status = 'active') then
      raise exception '그룹에는 운영진이 최소 1명 있어야 해요. 다른 사람을 먼저 운영진으로 지정해 주세요.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

------------------------------------------------------------
-- 3) 그룹 만들기 고침: 그룹장을 먼저 넣고, 만든 사람은 그다음 빼기
--    그룹장은 이메일 인증을 마친 계정만
------------------------------------------------------------
create or replace function admin_create_group(p_name text, p_description text, p_owner_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid;
  confirmed timestamptz;
  gid uuid;
begin
  if not is_platform_admin() then
    raise exception 'Nova Lab 관리자만 그룹을 만들 수 있어요.';
  end if;
  select id, email_confirmed_at into owner_id, confirmed
  from auth.users where lower(email) = lower(trim(p_owner_email));
  if owner_id is null then
    raise exception '% 로 가입된 계정이 없어요. 그룹장이 먼저 회원가입해야 해요.', p_owner_email;
  end if;
  if confirmed is null then
    raise exception '% 계정은 이메일 인증을 아직 안 했어요. 인증을 마친 계정만 그룹장이 될 수 있어요.', p_owner_email;
  end if;

  insert into groups (name, description, created_by)
  values (trim(p_name), nullif(trim(p_description), ''), owner_id)
  returning id into gid;

  insert into group_members (group_id, user_id, role, status)
  values (gid, owner_id, 'admin', 'active')
  on conflict (group_id, user_id) do update set role = 'admin', status = 'active';

  -- 만든 Nova Lab 관리자는 멤버에서 빼기 (관리자 권한은 1번 규칙으로 계속 있음)
  delete from group_members where group_id = gid and user_id <> owner_id;

  return gid;
end $$;

-- 그룹장 바꾸기 (Nova Lab만)
create or replace function admin_set_owner(p_group uuid, p_owner_email text) returns void
language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'Nova Lab 관리자만 그룹장을 바꿀 수 있어요.';
  end if;
  select id into owner_id from auth.users
  where lower(email) = lower(trim(p_owner_email)) and email_confirmed_at is not null;
  if owner_id is null then
    raise exception '% 로 인증을 마친 계정이 없어요.', p_owner_email;
  end if;
  insert into group_members (group_id, user_id, role, status)
  values (p_group, owner_id, 'admin', 'active')
  on conflict (group_id, user_id) do update set role = 'admin', status = 'active';
  update groups set created_by = owner_id where id = p_group;
end $$;
revoke all on function admin_set_owner(uuid, text) from public;
grant execute on function admin_set_owner(uuid, text) to authenticated;

------------------------------------------------------------
-- 4) 초대: 운영진이 가입한 사람을 이메일로 바로 넣기 (역할 지정)
------------------------------------------------------------
create or replace function group_invite(p_group uuid, p_email text, p_role text) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  uname text;
begin
  if not is_group_admin(p_group) then
    raise exception '운영진만 초대할 수 있어요.';
  end if;
  if p_role not in ('admin', 'evaluator', 'mentor', 'trainee') then
    raise exception '알 수 없는 역할이에요.';
  end if;
  select u.id, p.display_name into uid, uname
  from auth.users u join profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email));
  if uid is null then
    raise exception '% 로 가입된 계정이 없어요. 먼저 이 사이트에 회원가입해 달라고 알려 주세요.', p_email;
  end if;
  insert into group_members (group_id, user_id, role, status)
  values (p_group, uid, p_role, 'active')
  on conflict (group_id, user_id) do update set role = excluded.role, status = 'active';
  return uname;
end $$;
revoke all on function group_invite(uuid, text, text) from public;
grant execute on function group_invite(uuid, text, text) to authenticated;

------------------------------------------------------------
-- 5) 그룹 삭제 요청 → Nova Lab 승인
------------------------------------------------------------
alter table groups add column if not exists deletion_requested_at timestamptz;
alter table groups add column if not exists deletion_requested_by uuid references profiles(id) on delete set null;
alter table groups add column if not exists deletion_reason text;

create or replace function request_group_deletion(p_group uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_group_admin(p_group) then
    raise exception '운영진만 삭제를 요청할 수 있어요.';
  end if;
  update groups set deletion_requested_at = now(), deletion_requested_by = auth.uid(),
                    deletion_reason = nullif(trim(p_reason), '')
  where id = p_group;
end $$;
create or replace function cancel_group_deletion(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_group_admin(p_group) then
    raise exception '운영진만 취소할 수 있어요.';
  end if;
  update groups set deletion_requested_at = null, deletion_requested_by = null, deletion_reason = null
  where id = p_group;
end $$;
revoke all on function request_group_deletion(uuid, text) from public;
revoke all on function cancel_group_deletion(uuid) from public;
grant execute on function request_group_deletion(uuid, text) to authenticated;
grant execute on function cancel_group_deletion(uuid) to authenticated;

-- 관리자 화면 그룹 목록에 삭제 요청 표시 (돌려주는 칸이 바뀌어서 지우고 다시 만들기)
drop function if exists admin_list_groups();
create function admin_list_groups()
returns table (id uuid, name text, created_at timestamptz, owner_name text, owner_email text,
               member_count bigint, team_count bigint, session_count bigint, evaluation_count bigint,
               deletion_requested_at timestamptz, deletion_reason text)
language plpgsql security definer set search_path = public stable as $$
begin
  if not is_platform_admin() then
    raise exception 'Nova Lab 관리자만 볼 수 있어요.';
  end if;
  return query
    select g.id, g.name, g.created_at, p.display_name, u.email::text,
      (select count(*) from group_members m where m.group_id = g.id and m.status = 'active'),
      (select count(*) from teams t where t.group_id = g.id),
      (select count(*) from sessions s where s.group_id = g.id),
      (select count(*) from evaluations e join sessions s on s.id = e.session_id where s.group_id = g.id),
      g.deletion_requested_at, g.deletion_reason
    from groups g
    left join profiles p on p.id = g.created_by
    left join auth.users u on u.id = g.created_by
    order by g.deletion_requested_at desc nulls last, g.created_at desc;
end $$;
revoke all on function admin_list_groups() from public;
grant execute on function admin_list_groups() to authenticated;

------------------------------------------------------------
-- 6) Nova Lab 관리자: 가입자 관리 (인증 여부, 이름 수정, 계정 삭제)
------------------------------------------------------------
drop function if exists admin_list_users();
create function admin_list_users()
returns table (id uuid, email text, display_name text, is_platform_admin boolean,
               email_confirmed boolean, owned_groups bigint, group_count bigint, created_at timestamptz)
language plpgsql security definer set search_path = public stable as $$
begin
  if not is_platform_admin() then
    raise exception 'Nova Lab 관리자만 볼 수 있어요.';
  end if;
  return query
    select p.id, u.email::text, p.display_name, p.is_platform_admin,
           u.email_confirmed_at is not null,
           (select count(*) from groups g where g.created_by = p.id),
           (select count(*) from group_members m where m.user_id = p.id and m.status = 'active'),
           p.created_at
    from profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;
revoke all on function admin_list_users() from public;
grant execute on function admin_list_users() to authenticated;

create or replace function admin_rename_user(p_user uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Nova Lab 관리자만 바꿀 수 있어요.';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception '이름을 입력해 주세요.';
  end if;
  update profiles set display_name = trim(p_name) where id = p_user;
end $$;
revoke all on function admin_rename_user(uuid, text) from public;
grant execute on function admin_rename_user(uuid, text) to authenticated;

-- 계정 삭제: 잘못 만든 계정 정리용. 그 사람이 남긴 평가 기록은 그대로 남아요.
create or replace function admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'Nova Lab 관리자만 계정을 삭제할 수 있어요.';
  end if;
  if p_user = auth.uid() then
    raise exception '내 계정은 여기서 삭제할 수 없어요.';
  end if;
  if exists (select 1 from groups where created_by = p_user) then
    raise exception '그룹장인 계정이에요. 먼저 그 그룹의 그룹장을 바꿔 주세요.';
  end if;
  delete from auth.users where id = p_user;
end $$;
revoke all on function admin_delete_user(uuid) from public;
grant execute on function admin_delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
