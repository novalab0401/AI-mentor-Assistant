-- 6단계: 평가지 확장 (판단하기 어려움 + 서술형 의견)
-- score가 비어 있으면(null) "판단하기 어려움" 또는 서술형 의견 줄이에요.
-- 1~4점 제한(check)은 그대로 유지돼요.
alter table evaluations alter column score drop not null;

notify pgrst, 'reload schema';
