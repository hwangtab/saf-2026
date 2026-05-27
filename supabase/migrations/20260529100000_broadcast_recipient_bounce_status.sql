-- supabase/migrations/20260529100000_broadcast_recipient_bounce_status.sql
-- Resend 웹훅이 기록하는 bounce/complaint 상태를 recipients status CHECK에 추가.
ALTER TABLE public.email_broadcast_recipients
  DROP CONSTRAINT IF EXISTS email_broadcast_recipients_status_check;

ALTER TABLE public.email_broadcast_recipients
  ADD CONSTRAINT email_broadcast_recipients_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'bounced', 'complained'));
