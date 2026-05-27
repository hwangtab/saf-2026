-- supabase/migrations/20260528130000_email_broadcast_recipients.sql
CREATE TABLE IF NOT EXISTS public.email_broadcast_recipients (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid        NOT NULL REFERENCES public.email_broadcasts(id) ON DELETE CASCADE,
  email        text        NOT NULL,
  name         text,
  locale       text        NOT NULL DEFAULT 'ko',
  status       text        NOT NULL DEFAULT 'pending',
  resend_id    text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_broadcast_recipients_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT email_broadcast_recipients_locale_check
    CHECK (locale IN ('ko', 'en'))
);

CREATE INDEX idx_broadcast_recipients_dispatch
  ON public.email_broadcast_recipients (broadcast_id, status)
  WHERE status = 'pending';

ALTER TABLE public.email_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on email_broadcast_recipients"
  ON public.email_broadcast_recipients FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on email_broadcast_recipients"
  ON public.email_broadcast_recipients FOR ALL TO service_role
  USING (true) WITH CHECK (true);
