-- supabase/migrations/20260610100100_sms_suppressions.sql
-- 채널별 SMS 수신거부·바운스·컴플레인 통합 테이블 (email_suppressions 미러).
-- phone_hash = sha256(petition_salt + normalizeKoreanMobile(phone)), hex encoding.
CREATE TABLE IF NOT EXISTS public.sms_suppressions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash  text        NOT NULL,
  channel     text        NOT NULL,  -- 'customer' | 'member' | 'individual' | 'all'
  reason      text,                  -- 'unsubscribe' | 'bounce' | 'complaint' | 'manual'
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone_hash, channel),
  CONSTRAINT sms_suppressions_channel_check
    CHECK (channel IN ('customer', 'member', 'individual', 'all')),
  CONSTRAINT sms_suppressions_reason_check
    CHECK (reason IS NULL OR reason IN ('unsubscribe', 'bounce', 'complaint', 'manual'))
);

ALTER TABLE public.sms_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on sms_suppressions"
  ON public.sms_suppressions FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on sms_suppressions"
  ON public.sms_suppressions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
