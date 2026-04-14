-- 20260206010000_optimize_profiles_rls.sql 에서 더 엄격한 정책
-- "Profiles select own or admin" 을 추가했지만, 기존의 using(true) 정책을
-- DROP하지 않아 RLS 정책이 OR 결합 방식으로 여전히 공개 조회가 가능했음.
-- 이 migration은 해당 공개 정책을 명시적으로 제거한다.
DROP POLICY IF EXISTS "Public viewable profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

NOTIFY pgrst, 'reload';
