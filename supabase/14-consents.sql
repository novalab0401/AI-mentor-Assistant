-- 14단계: 약관·개인정보 동의 기록
-- 13단계 다음에 실행하세요. 다시 실행해도 괜찮아요.

create table if not exists user_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  research_opt_in boolean not null default false, -- [선택] 비식별 데이터 연구 활용
  agreed_at timestamptz not null default now()
);
alter table user_consents enable row level security;

drop policy if exists "본인 동의 조회" on user_consents;
create policy "본인 동의 조회" on user_consents for select to authenticated
  using (user_id = auth.uid() or is_platform_admin());
drop policy if exists "본인 동의 기록" on user_consents;
create policy "본인 동의 기록" on user_consents for insert to authenticated
  with check (user_id = auth.uid());
-- 동의 기록은 고치거나 지울 수 없어요 (언제 무엇에 동의했는지 증거)

-- 회원가입할 때 프로필과 함께 동의 기록도 자동으로 남기기
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
                           split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  if new.raw_user_meta_data ? 'terms_version' then
    insert into user_consents (user_id, terms_version, privacy_version, research_opt_in)
    values (new.id,
            new.raw_user_meta_data->>'terms_version',
            new.raw_user_meta_data->>'privacy_version',
            coalesce((new.raw_user_meta_data->>'research_opt_in')::boolean, false));
  end if;
  return new;
end $$;

-- Nova Lab 관리자: 연구 활용에 동의한 사람 수 등 확인용
create or replace function admin_consent_summary()
returns table (terms_version text, privacy_version text, agreed bigint, research_opt_in bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not is_platform_admin() then
    raise exception 'Nova Lab 관리자만 볼 수 있어요.';
  end if;
  return query
    select c.terms_version, c.privacy_version, count(distinct c.user_id),
           count(distinct c.user_id) filter (where c.research_opt_in)
    from user_consents c
    group by c.terms_version, c.privacy_version
    order by c.terms_version desc;
end $$;
revoke all on function admin_consent_summary() from public;
grant execute on function admin_consent_summary() to authenticated;

notify pgrst, 'reload schema';
