-- 청원(petition) 채널 추가: 청원 서명자에게 진행상황 SMS 통지(정보성).
-- sms_broadcasts / sms_suppressions의 channel CHECK에 'petition' 값을 추가한다.
-- additive — 기존 행(petition 값 없음)에 영향 없음.

ALTER TABLE public.sms_broadcasts DROP CONSTRAINT IF EXISTS sms_broadcasts_channel_check;
ALTER TABLE public.sms_broadcasts
  ADD CONSTRAINT sms_broadcasts_channel_check
  CHECK (channel IN ('customer', 'member', 'individual', 'petition'));

ALTER TABLE public.sms_suppressions DROP CONSTRAINT IF EXISTS sms_suppressions_channel_check;
ALTER TABLE public.sms_suppressions
  ADD CONSTRAINT sms_suppressions_channel_check
  CHECK (channel IN ('customer', 'member', 'individual', 'petition', 'all'));
