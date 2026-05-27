-- supabase/migrations/20260528120000_email_broadcasts.sql
CREATE TABLE IF NOT EXISTS public.email_broadcasts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         text        NOT NULL,
  petition_slug   text,
  subject         text        NOT NULL,
  body_md         text        NOT NULL,
  cta_label       text,
  cta_url         text,
  audience_filter jsonb       NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'draft',
  recipient_count int         NOT NULL DEFAULT 0,
  sent_count      int         NOT NULL DEFAULT 0,
  failed_count    int         NOT NULL DEFAULT 0,
  created_by      uuid        REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  queued_at       timestamptz,
  sent_at         timestamptz,
  CONSTRAINT email_broadcasts_channel_check
    CHECK (channel IN ('customer', 'member', 'petition')),
  CONSTRAINT email_broadcasts_status_check
    CHECK (status IN ('draft', 'queued', 'sending', 'sent', 'failed', 'cancelled'))
);

ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on email_broadcasts"
  ON public.email_broadcasts FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on email_broadcasts"
  ON public.email_broadcasts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
