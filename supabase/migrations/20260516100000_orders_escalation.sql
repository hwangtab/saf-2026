-- SLA 에스컬레이션 추적 컬럼 추가
-- paid/preparing 상태 주문이 72시간 초과 시 어드민 수동 마킹 가능
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_note TEXT;

COMMENT ON COLUMN orders.escalated_at IS '관리자 수동 에스컬레이션 마킹 시각';
COMMENT ON COLUMN orders.escalation_note IS '에스컬레이션 사유/메모';
