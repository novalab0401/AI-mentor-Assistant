-- 13단계: 발표자(평가받는 사람)를 그룹 멤버와 연결 → 본인이 "내가 받은 평가"에서 확인
-- 12단계 다음에 실행하세요. 다시 실행해도 괜찮아요.

alter table sessions add column if not exists presenter_id uuid references profiles(id) on delete set null;

-- 발표자는 그 그룹의 활동 멤버여야 해요 (비워 두면 멤버가 아닌 사람)
drop policy if exists "운영진 시연 등록" on sessions;
create policy "운영진 시연 등록" on sessions for insert to authenticated
  with check (
    (is_group_admin(group_id)
      or (team_id is not null and is_team_leader(team_id) and team_group(team_id) = group_id))
    and (presenter_id is null or is_active_in_group(presenter_id, group_id))
  );
drop policy if exists "운영진 시연 수정" on sessions;
create policy "운영진 시연 수정" on sessions for update to authenticated
  using (is_group_admin(group_id) or (team_id is not null and is_team_leader(team_id)))
  with check (
    (is_group_admin(group_id)
      or (team_id is not null and is_team_leader(team_id) and team_group(team_id) = group_id))
    and (presenter_id is null or is_active_in_group(presenter_id, group_id))
  );

-- 내가 받은 평가 목록 (공개된 것만 피드백 링크를 돌려줘요)
create or replace function my_feedback_list()
returns table (session_id uuid, session_no bigint, session_date date, mentor_name text, major text,
               rubric_type text, group_name text, team_name text,
               feedback_open boolean, feedback_token uuid, evaluator_count bigint)
language sql security definer set search_path = public stable as $$
  select s.id, s.session_no, s.session_date, s.mentor_name, s.major, s.rubric_type,
         g.name, t.name, s.feedback_open,
         case when s.feedback_open then s.feedback_token end,
         (select count(distinct e.evaluator_name) from evaluations e
          where e.session_id = s.id and e.deleted_at is null)
  from sessions s
  join groups g on g.id = s.group_id
  left join teams t on t.id = s.team_id
  where s.presenter_id = auth.uid() and s.deleted_at is null
  order by s.session_date desc, s.session_no desc
$$;
revoke all on function my_feedback_list() from public;
grant execute on function my_feedback_list() to authenticated;

notify pgrst, 'reload schema';
