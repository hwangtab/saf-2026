-- Resend Inbound 회신 저장 테이블.
-- webhook 재시도에 안전하도록 resend_email_id를 unique 키로 사용한다.
CREATE TABLE IF NOT EXISTS public.email_inbound_messages (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id                 text        NOT NULL,
  message_id                      text,
  in_reply_to                     text,
  references_header               text,
  from_email                      text,
  to_emails                       text[]      NOT NULL DEFAULT '{}',
  cc_emails                       text[]      NOT NULL DEFAULT '{}',
  subject                         text,
  text_body                       text,
  html_body                       text,
  headers                         jsonb       NOT NULL DEFAULT '{}',
  attachments                     jsonb       NOT NULL DEFAULT '[]',
  status                          text        NOT NULL DEFAULT 'new',
  matched_broadcast_recipient_id  uuid        REFERENCES public.email_broadcast_recipients(id) ON DELETE SET NULL,
  reply_resend_id                 text,
  replied_by                      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  received_at                     timestamptz NOT NULL DEFAULT now(),
  replied_at                      timestamptz,
  CONSTRAINT email_inbound_messages_resend_email_id_key UNIQUE (resend_email_id),
  CONSTRAINT email_inbound_messages_status_check
    CHECK (status IN ('new', 'read', 'replied', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_email_inbound_messages_received_at
  ON public.email_inbound_messages (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_inbound_messages_status_received
  ON public.email_inbound_messages (status, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_inbound_messages_matched_recipient
  ON public.email_inbound_messages (matched_broadcast_recipient_id)
  WHERE matched_broadcast_recipient_id IS NOT NULL;

ALTER TABLE public.email_inbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on email_inbound_messages"
  ON public.email_inbound_messages FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY "Service role full access on email_inbound_messages"
  ON public.email_inbound_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_inbound_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_inbound_messages TO service_role;
