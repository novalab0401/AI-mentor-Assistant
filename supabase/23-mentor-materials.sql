-- 23단계: 멘토 소속(대학·학과·학년), 발표 자료(PDF·PPTX) 업로드와 AI 분석, 데이터 현황
-- 다시 실행해도 괜찮아요.

-- 1) 멘토 소속: 본인이 '내 정보'에서 적어요
alter table profiles add column if not exists university text;
alter table profiles add column if not exists department text;
alter table profiles add column if not exists grade_label text;  -- 1학년~4학년, 대학원, 졸업, 기타
-- 본인이 고칠 수 있는 칸만 열어요 (is_platform_admin 같은 칸은 계속 막혀 있어요)
grant update (display_name, university, department, grade_label) on profiles to authenticated;

-- 2) 수업 때의 발표자 소속을 수업에 함께 남겨요 (나중에 소속이 바뀌어도 그때 기록이 남게)
alter table sessions add column if not exists presenter_university text;
alter table sessions add column if not exists presenter_department text;

-- 3) 발표 자료
create table if not exists materials (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  kind text not null default 'slides',
  file_name text not null,
  mime text not null,
  size_bytes bigint not null,
  storage_path text not null,
  page_count int,
  extracted jsonb,        -- { slides: [{ n, text }] } AI·프로그램이 읽은 슬라이드별 글자
  extract_status text not null default 'none' check (extract_status in ('ok', 'failed', 'none')),
  created_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table materials enable row level security;
drop policy if exists "자료 조회" on materials;
create policy "자료 조회" on materials for select to authenticated
  using (created_by = auth.uid() or can_ai_session(session_id));
drop policy if exists "자료 저장" on materials;
create policy "자료 저장" on materials for insert to authenticated
  with check (can_ai_session(session_id) and created_by = auth.uid());

-- 4) 파일 보관함(비공개): 경로는 "수업ID/파일이름"
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 20971520,
        array['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 경로 첫 폴더(수업ID)로 권한 확인. 수업ID 모양이 아니면 거절
create or replace function material_session_ok(p_name text) returns boolean
language plpgsql security definer set search_path = public stable as $$
declare sid uuid;
begin
  begin
    sid := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return can_ai_session(sid);
end $$;

drop policy if exists "자료 파일 올리기" on storage.objects;
create policy "자료 파일 올리기" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and material_session_ok(name));
drop policy if exists "자료 파일 읽기" on storage.objects;
create policy "자료 파일 읽기" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and material_session_ok(name));

-- 5) Nova Lab 관리자: 대학·학과별 데이터 현황
drop function if exists admin_data_summary();
create function admin_data_summary()
returns table (uni text, dept text, mentor_count bigint, session_count bigint,
               transcript_count bigint, material_count bigint, ai_run_count bigint, human_eval_count bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not is_platform_admin() then
    raise exception 'Nova Lab 관리자만 볼 수 있어요.';
  end if;
  return query
    select coalesce(x.p_uni, '(미입력)'), coalesce(x.p_dept, '(미입력)'),
           count(distinct x.who), count(*), sum(x.t)::bigint, sum(x.m)::bigint, sum(x.r)::bigint, sum(x.e)::bigint
    from (
      select s.presenter_university as p_uni, s.presenter_department as p_dept,
             coalesce(s.presenter_id::text, s.mentor_name) as who,
             (select count(*) from transcripts t where t.session_id = s.id) as t,
             (select count(*) from materials m where m.session_id = s.id) as m,
             (select count(*) from ai_runs r where r.session_id = s.id) as r,
             (select count(*) from evaluations e where e.session_id = s.id) as e
      from sessions s
      where s.deleted_at is null
    ) x
    group by 1, 2
    order by 4 desc;
end $$;
revoke all on function admin_data_summary() from public;
grant execute on function admin_data_summary() to authenticated;

notify pgrst, 'reload schema';
