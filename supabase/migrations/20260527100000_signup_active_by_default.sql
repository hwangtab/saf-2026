-- 신규 가입자를 즉시 active로 설정.
--
-- 기존 상태:
--   handle_new_user 트리거가 모든 신규 가입자를 status='pending'으로 INSERT.
--   collector(일반 고객)도 pending이 돼 심사 큐에 올라오고, 신청서가 없어 승인도
--   못 하는 상태로 갇히는 문제가 있었음.
--
-- 조치:
--   1) handle_new_user 트리거를 status='active'로 변경.
--      심사 큐 진입 기준은 "신청서(artist/exhibitor application) 제출"로 이원화
--      (submitArtistApplication 서버 액션이 제출 시 status='pending'으로 승격).
--   2) 기존에 신청서 없이 pending 상태로 갇혀 있는 role='user' 프로필을 active로 백필.

-- 1) 트리거 업데이트 -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'full_name', ''),
      NULLIF(new.raw_user_meta_data->>'name', ''),
      NULLIF(new.raw_user_meta_data->>'preferred_username', ''),
      NULLIF(new.raw_user_meta_data->>'user_name', ''),
      NULLIF(new.raw_user_meta_data->>'nickname', '')
    ),
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'avatar_url', ''),
      NULLIF(new.raw_user_meta_data->>'picture', '')
    ),
    'active'::public.user_status
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) 백필: 신청서 없이 pending 상태로 갇힌 role='user' 프로필 해제 --------
-- 작가(role='artist') · 출품자(role='exhibitor') 행은 건드리지 않음.
-- artist_applications 또는 exhibitor_applications가 있는 경우도 제외
-- (실제 심사 대상 → 계속 pending 유지).
--
-- prevent_profile_self_escalation 트리거는 JWT 세션 기반 검사라
-- 마이그레이션 컨텍스트에서는 통과하지 못하므로 UPDATE 구간만 비활성화 후 복원.

ALTER TABLE public.profiles DISABLE TRIGGER profiles_prevent_self_escalation;

UPDATE public.profiles p
SET status = 'active'::public.user_status
WHERE p.status = 'pending'
  AND p.role = 'user'
  AND NOT EXISTS (SELECT 1 FROM public.artist_applications a WHERE a.user_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.exhibitor_applications e WHERE e.user_id = p.id);

ALTER TABLE public.profiles ENABLE TRIGGER profiles_prevent_self_escalation;
