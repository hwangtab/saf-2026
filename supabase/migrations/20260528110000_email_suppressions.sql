-- supabase/migrations/20260528110000_email_suppressions.sql
-- 채널별 수신거부·바운스·컴플레인 통합 테이블.
-- email_hash = sha256(petition_salt + lower(trim(email))), hex encoding.
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash  text        NOT NULL,
  channel     text        NOT NULL,  -- 'customer' | 'member' | 'petition' | 'all'
  reason      text,                  -- 'unsubscribe' | 'bounce' | 'complaint' | 'manual'
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_hash, channel),
  CONSTRAINT email_suppressions_channel_check
    CHECK (channel IN ('customer', 'member', 'petition', 'all')),
  CONSTRAINT email_suppressions_reason_check
    CHECK (reason IS NULL OR reason IN ('unsubscribe', 'bounce', 'complaint', 'manual'))
);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on email_suppressions"
  ON public.email_suppressions FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on email_suppressions"
  ON public.email_suppressions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
