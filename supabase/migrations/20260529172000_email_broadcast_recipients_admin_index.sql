-- Migration: email_broadcast_recipients에 broadcast_id 단독 인덱스 추가.
--
-- 배경: 20260528130000_email_broadcast_recipients.sql은 dispatch 루프용 partial 인덱스
-- (broadcast_id, status) WHERE status = 'pending'만 등록. 발송 완료 후 admin 대시보드에서
-- broadcast_id로 전체 recipients(sent/failed/bounced 포함)를 조회할 때 partial 인덱스가
-- 사용되지 않아 seq scan 발생.
--
-- 영향: 대량 발송(11,508건 사례) 후 admin 보고서가 점점 느려지는 회귀를 사전 차단.

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id
  ON public.email_broadcast_recipients (broadcast_id);
