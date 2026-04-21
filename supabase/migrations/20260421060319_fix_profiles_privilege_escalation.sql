-- Prevent authenticated users from self-escalating role/status on public.profiles.
--
-- 기존 상태:
--   RLS "Profiles update own or admin"은 auth.uid() = id 조건만 검사하고
--   `GRANT ALL ON TABLE public.profiles TO authenticated` 로 전체 컬럼 UPDATE가 허용됨.
--   role/status 를 보호하는 트리거/컬럼권한 없음 → 모든 인증 사용자가 자신의 row에서
--   role='admin', status='active' 로 임의 변경 가능 (privilege escalation).
--
-- 조치:
--   1) authenticated에게 부여된 포괄 UPDATE 권한을 회수하고 민감하지 않은 컬럼에만
--      컬럼 단위 UPDATE 권한을 재부여한다. role/status/id 는 제외.
--   2) 이중 방어로 BEFORE UPDATE 트리거를 추가해 비관리자가 role/status 컬럼을
--      바꾸려 하면 예외를 발생시킨다. 컬럼 GRANT가 실수로 되살아나도 막힘.
--
-- 관리자는 service_role (SUPABASE_SERVICE_ROLE_KEY) 로 동작하는 서버 액션에서
-- 프로필을 수정하므로 이 조치로 정상 운영에 영향 없음.

BEGIN;

-- 1) 컬럼 단위 GRANT ---------------------------------------------------------

REVOKE UPDATE ON TABLE public.profiles FROM authenticated;

GRANT UPDATE (name, email, avatar_url) ON TABLE public.profiles TO authenticated;

-- 2) BEFORE UPDATE 트리거 ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role (admin API) 및 관리자 사용자는 role/status 를 변경할 수 있음.
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.get_my_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.role / profiles.status / profiles.id 는 관리자만 변경할 수 있습니다.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_profile_self_escalation() FROM public;

DROP TRIGGER IF EXISTS profiles_prevent_self_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_self_escalation();

COMMENT ON FUNCTION public.prevent_profile_self_escalation() IS
  '비관리자가 profiles.role/status/id 를 자기 row 에서 변경하지 못하도록 차단한다. service_role 및 admin 역할은 통과.';

-- 스키마 캐시 리로드
NOTIFY pgrst, 'reload';

COMMIT;
