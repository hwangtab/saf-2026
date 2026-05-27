-- supabase/migrations/20260528100000_email_profiles_marketing_consent.sql
-- Phase 2(고객 마케팅)에서 사용하지만 스키마 준비는 Phase 0에서.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_consent        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at     timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent_source text;

COMMENT ON COLUMN public.profiles.marketing_consent IS
  '광고성 이메일 수신 동의 여부 (정통망법 §50). true=동의, false=미동의/거부.';
COMMENT ON COLUMN public.profiles.marketing_consent_source IS
  '''signup'' | ''mypage'' | ''admin''';
