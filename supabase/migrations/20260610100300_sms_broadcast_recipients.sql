-- supabase/migrations/20260610100300_sms_broadcast_recipients.sql
CREATE TABLE IF NOT EXISTS public.sms_broadcast_recipients (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id        uuid        NOT NULL REFERENCES public.sms_broadcasts(id) ON DELETE CASCADE,
  phone               text        NOT NULL,
  name                text,
  status              text        NOT NULL DEFAULT 'pending',
  provider_message_id text,
  segment             text,       -- 'SMS' | 'LMS' (발송 후 Solapi 응답)
  error               text,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_broadcast_recipients_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped'))
);

-- 디스패치 선두 pending 청크 조회용 부분 인덱스 (pending 변형 중 offset 누적 금지).
CREATE INDEX IF NOT EXISTS idx_sms_broadcast_recipients_dispatch
  ON public.sms_broadcast_recipients (broadcast_id, status)
  WHERE status = 'pending';

-- 이력 화면 카운트(sent/failed 집계)용 broadcast_id 인덱스.
CREATE INDEX IF NOT EXISTS idx_sms_broadcast_recipients_broadcast
  ON public.sms_broadcast_recipients (broadcast_id);

ALTER TABLE public.sms_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on sms_broadcast_recipients"
  ON public.sms_broadcast_recipients FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on sms_broadcast_recipients"
  ON public.sms_broadcast_recipients FOR ALL TO service_role
  USING (true) WITH CHECK (true);
