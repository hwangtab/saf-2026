-- supabase/migrations/20260603120000_email_broadcasts_individual_and_ad_flag.sql
-- 광고 여부를 채널에서 분리(현재 channel='customer' 하드코딩) + 검색 발송용 individual 채널 추가.

-- 1) is_advertisement 플래그
ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS is_advertisement boolean NOT NULL DEFAULT false;

-- 기존 동작 보존: customer 채널은 광고였음
UPDATE public.email_broadcasts SET is_advertisement = true WHERE channel = 'customer';

-- 2) individual 채널값 (email_broadcasts)
ALTER TABLE public.email_broadcasts DROP CONSTRAINT IF EXISTS email_broadcasts_channel_check;
ALTER TABLE public.email_broadcasts ADD CONSTRAINT email_broadcasts_channel_check
  CHECK (channel IN ('customer', 'member', 'petition', 'individual'));

-- 3) individual 채널값 (email_suppressions)
ALTER TABLE public.email_suppressions DROP CONSTRAINT IF EXISTS email_suppressions_channel_check;
ALTER TABLE public.email_suppressions ADD CONSTRAINT email_suppressions_channel_check
  CHECK (channel IN ('customer', 'member', 'petition', 'individual', 'all'));
