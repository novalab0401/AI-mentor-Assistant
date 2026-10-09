-- 11단계: 그룹은 Nova Lab이 만들어 넘겨주고, 데이터는 지워지지 않게 (보관 삭제)
-- 9·10단계 다음에 실행하세요. 다시 실행해도 괜찮아요.

create or replace function is_platform_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false)
$$;

------------------------------------------------------------
-- 1) 그룹 만들기·삭제는 Nova Lab 관리자만
------------------------------------------------------------
drop policy if exists "그룹 만들기" on groups;
create policy "그룹 만들기" on groups for insert to authenticated
  with check (is_platform_admin());
drop policy if exists "운영진 그룹 삭제" on groups;
drop policy if exists "Nova Lab 그룹 삭제" on groups;
create policy "Nova Lab 그룹 삭제" on groups for delete to authenticated
  using (is_platform_admin());

-- Nova Lab 관리자가 그룹을 만들고, 가입된 사람(이메일) 한 명을 그룹장(운영진)으로 지정
create or replace function admin_create_group(p_name text, p_description text, p_owner_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid;
  gid uuid;
begin
  if not is_platform_admin() then
    raise exception 'Nova Lab 관리자만 그룹을 만들 수 있어요.';
  end if;
  select id into owner_id from auth.users where lower(email) = lower(trim(p_owner_email));
  if owner_id is null then
    raise exception '% 로 가입된 계정이 없어요. 그룹장이 먼저 회원가입해야 해요.', p_owner_email;
  end if;

  insert into groups (name, description, created_by)
  values (trim(p_name), nullif(trim(p_description), ''), owner_id)
  returning id into gid;

  -- 그룹장 = 첫 운영진 (만든 Nova Lab 관리자는 자동으로 들어가지 않게 정리)
  delete from group_members where group_id = gid and user_id <> owner_id;
  insert into group_members (group_id, user_id, role, status)
  values (gid, owner_id, 'admin', 'active')
  on conflict (group_id, user_id) do update set role = 'admin', status = 'active';

  return gid;
end $$;
revoke all on function admin_create_group(text, text, text) from public;
grant execute on function admin_create_group(text, text, text) to authenticated;

-- Nova Lab 관리자 화면: 전체 그룹 현황
create or replace function admin_list_groups()
returns table (id uuid, name text, created_at timestamptz, owner_name text, owner_email text,
               member_count bigint, team_count bigint, session_count bigint, evaluation_count bigint)
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
      (select count(*) from evaluations e join sessions s on s.id = e.session_id where s.group_id = g.id)
    from groups g
    left join profiles p on p.id = g.created_by
    left join auth.users u on u.id = g.created_by
    order by g.created_at desc;
end $$;
revoke all on function admin_list_groups() from public;
grant execute on function admin_list_groups() to authenticated;

------------------------------------------------------------
-- 2) 수업·평가는 지워도 DB에는 남기기 (보관 삭제)
------------------------------------------------------------
alter table sessions add column if not exists deleted_at timestamptz;
alter table evaluations add column if not exists deleted_at timestamptz;

-- 보이는 건 삭제 안 된 것만
drop policy if exists "그룹 멤버 시연 조회" on sessions;
create policy "그룹 멤버 시연 조회" on sessions for select to authenticated
  using (deleted_at is null and is_group_member(group_id));
drop policy if exists "운영진 평가 조회" on evaluations;
create policy "운영진 평가 조회" on evaluations for select to authenticated
  using (deleted_at is null and can_manage_session(session_id));

-- 진짜 삭제는 아무도 못 하게 (Nova Lab은 대시보드에서만)
drop policy if exists "운영진 시연 삭제" on sessions;
drop policy if exists "운영진 평가 삭제" on evaluations;

-- 수업 보관 삭제: 운영진·그 팀 팀장
create or replace function archive_session(p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_session(p_session) then
    raise exception '이 수업을 삭제할 권한이 없어요.';
  end if;
  update sessions set deleted_at = now() where id = p_session and deleted_at is null;
  update evaluations set deleted_at = now() where session_id = p_session and deleted_at is null;
end $$;
revoke all on function archive_session(uuid) from public;
grant execute on function archive_session(uuid) to authenticated;

-- 평가자 한 명의 평가 보관 삭제
create or replace function archive_evaluator(p_session uuid, p_evaluator text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not can_manage_session(p_session) then
    raise exception '이 평가를 삭제할 권한이 없어요.';
  end if;
  update evaluations set deleted_at = now()
  where session_id = p_session and evaluator_name = p_evaluator and deleted_at is null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function archive_evaluator(uuid, text) from public;
grant execute on function archive_evaluator(uuid, text) to authenticated;

-- 링크로 들어오는 화면도 삭제된 건 안 보이게
create or replace function get_evaluation_session(p_id uuid)
returns table (session_no bigint, mentor_name text, major text, rubric_type text)
language sql security definer set search_path = public stable
as $$
  select s.session_no, s.mentor_name, s.major, s.rubric_type
  from sessions s where s.id = p_id and s.deleted_at is null
$$;

create or replace function get_feedback(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public stable
as $$
declare
  s sessions%rowtype;
begin
  select * into s from sessions where feedback_token = p_token and deleted_at is null;
  if not found then
    return null;
  end if;
  if not s.feedback_open then
    return jsonb_build_object('open', false, 'mentor_name', s.mentor_name);
  end if;
  return jsonb_build_object(
    'open', true,
    'session_no', s.session_no,
    'mentor_name', s.mentor_name,
    'major', s.major,
    'session_date', s.session_date,
    'rubric_type', s.rubric_type,
    'evaluations', coalesce((
      select jsonb_agg(
        jsonb_build_object('evaluator', x.n, 'item_id', x.item_id, 'score', x.score, 'memo', x.memo)
        order by x.n, x.id)
      from (
        select e.id, e.item_id, e.score, e.memo,
               dense_rank() over (order by f.first_at, e.evaluator_name) as n
        from evaluations e
        join (
          select evaluator_name, min(created_at) as first_at
          from evaluations where session_id = s.id and deleted_at is null
          group by evaluator_name
        ) f on f.evaluator_name = e.evaluator_name
        where e.session_id = s.id and e.deleted_at is null
      ) x
    ), '[]'::jsonb)
  );
end
$$;

notify pgrst, 'reload schema';
