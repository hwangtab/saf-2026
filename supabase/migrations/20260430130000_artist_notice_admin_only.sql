-- 작가 페이지 공지 컬럼은 관리자만 변경 가능 (정책: 관리자가 우선)
-- 기존 RLS 정책 "Artists update own"이 작가 본인의 row update를 허용해 버려서,
-- 작가가 client에서 직접 자기 row의 notice_* 컬럼을 변경할 여지가 있었음.
-- BEFORE UPDATE 트리거로 column-level 보호 추가 — service_role(server actions의 admin client)과
-- 인증된 admin profile만 notice 컬럼 변경 허용, 나머지는 reject.
-- 일반 작가 정보(name_ko, bio, history 등) 업데이트는 기존 정책 그대로 통과.

CREATE OR REPLACE FUNCTION public.enforce_artist_notice_admin_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_role text;
  is_admin boolean;
BEGIN
  -- 1) supabase service_role(server-side admin client)은 항상 통과
  --    서버 액션 setArtistNotice/toggleArtistNotice/clearArtistNotice가 이 경로로 들어옴
  caller_role := current_setting('request.jwt.claims', true)::json->>'role';
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 2) 인증된 admin role 사용자도 통과
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- 3) 그 외(작가 본인 포함) — notice 관련 컬럼이 실제로 변경됐는지 확인 후 거부
  IF (
    NEW.notice_enabled IS DISTINCT FROM OLD.notice_enabled
    OR NEW.notice_type IS DISTINCT FROM OLD.notice_type
    OR NEW.notice_message IS DISTINCT FROM OLD.notice_message
    OR NEW.notice_message_en IS DISTINCT FROM OLD.notice_message_en
    OR NEW.notice_active_until IS DISTINCT FROM OLD.notice_active_until
    OR NEW.notice_updated_at IS DISTINCT FROM OLD.notice_updated_at
    OR NEW.notice_updated_by IS DISTINCT FROM OLD.notice_updated_by
  ) THEN
    RAISE EXCEPTION '작가 페이지 공지는 관리자만 변경할 수 있습니다.'
      USING ERRCODE = '42501';
  END IF;

  -- notice 컬럼 미변경: 일반 update는 통과
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_artist_notice_admin_only IS
  '작가 페이지 공지 컬럼(notice_*)을 관리자만 변경 가능하도록 강제하는 트리거 함수. '
  'service_role + admin role 외에는 notice 컬럼 변경 시도 시 42501 에러 반환.';

DROP TRIGGER IF EXISTS artists_notice_admin_only ON public.artists;

CREATE TRIGGER artists_notice_admin_only
  BEFORE UPDATE ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_artist_notice_admin_only();
