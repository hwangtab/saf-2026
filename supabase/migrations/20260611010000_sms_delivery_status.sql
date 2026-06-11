-- DLR(도달 리포트) 반영용: 통신사 최종 도달 결과를 기록할 status 값 + 조회 인덱스.
-- 'delivered'(수신완료)/'undelivered'(미도달) 추가. additive — 기존 행 영향 없음.

ALTER TABLE public.sms_broadcast_recipients DROP CONSTRAINT IF EXISTS sms_broadcast_recipients_status_check;
ALTER TABLE public.sms_broadcast_recipients
  ADD CONSTRAINT sms_broadcast_recipients_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'delivered', 'undelivered'));

-- provider_message_id로 DLR 매칭(Solapi messageId) — 미확정 sent 메시지 조회·갱신용.
CREATE INDEX IF NOT EXISTS idx_sms_broadcast_recipients_pmid
  ON public.sms_broadcast_recipients (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sms_logs_provider_message_id
  ON public.sms_logs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;
