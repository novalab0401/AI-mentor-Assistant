-- 18단계: Nova Lab 관리자 가입자 목록에 소속 그룹·역할 표시 (그룹별로 걸러 보기)
-- 다시 실행해도 괜찮아요.

drop function if exists admin_list_users();
create function admin_list_users()
returns table (id uuid, email text, display_name text, is_platform_admin boolean,
               email_confirmed boolean, owned_groups bigint, group_count bigint, created_at timestamptz,
               memberships jsonb)
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
           p.created_at,
           -- 소속: [{group_id, group_name, role, status, is_owner}]
           coalesce((
             select jsonb_agg(jsonb_build_object(
                      'group_id', g.id,
                      'group_name', g.name,
                      'role', m.role,
                      'status', m.status,
                      'is_owner', g.created_by = p.id)
                    order by g.name)
             from group_members m join groups g on g.id = m.group_id
             where m.user_id = p.id
           ), '[]'::jsonb)
    from profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;
revoke all on function admin_list_users() from public;
grant execute on function admin_list_users() to authenticated;

notify pgrst, 'reload schema';
