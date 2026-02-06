-- profiles 테이블 SELECT 정책 최적화
-- 기존 정책은 자기 자신을 조회할 때도 get_my_role() 함수를 호출하여 성능이 저하됨

DROP POLICY IF EXISTS "Profiles select own or admin" ON public.profiles;

CREATE POLICY "Profiles select own or admin" ON public.profiles
  FOR SELECT
  USING (
    -- 1. 자기 자신의 프로필은 즉시 허용 (가장 빠름)
    auth.uid() = id
    OR 
    -- 2. 관리자인 경우 다른 사람의 프로필 조회 허용
    public.get_my_role() = 'admin'
  );

-- 스키마 캐시 갱신
NOTIFY pgrst, 'reload';
