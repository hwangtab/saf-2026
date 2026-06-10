-- supabase/migrations/20260610100200_sms_broadcasts.sql
-- 마케팅/공지 브로드캐스트 SMS 캠페인 (email_broadcasts 미러; HTML/제목/CTA 없음, body_text 단일).
CREATE TABLE IF NOT EXISTS public.sms_broadcasts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel               text        NOT NULL,
  body_text             text        NOT NULL,
  audience_filter       jsonb       NOT NULL DEFAULT '{}',
  is_advertisement      boolean     NOT NULL DEFAULT false,
  status                text        NOT NULL DEFAULT 'draft',
  recipient_count       int         NOT NULL DEFAULT 0,
  sent_count            int         NOT NULL DEFAULT 0,
  failed_count          int         NOT NULL DEFAULT 0,
  dispatch_locked_until timestamptz,
  dispatch_lock_token   uuid,
  created_by            uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  queued_at             timestamptz,
  sent_at               timestamptz,
  CONSTRAINT sms_broadcasts_channel_check
    CHECK (channel IN ('customer', 'member', 'individual')),
  CONSTRAINT sms_broadcasts_status_check
    CHECK (status IN ('draft', 'queued', 'sending', 'sent', 'failed', 'cancelled'))
);

ALTER TABLE public.sms_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on sms_broadcasts"
  ON public.sms_broadcasts FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on sms_broadcasts"
  ON public.sms_broadcasts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
