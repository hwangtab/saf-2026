-- SLA 대시보드 쿼리 성능 개선: paid_at·escalated_at partial index 추가.
-- getDashboardOverviewStats() 및 getOrderList() SLA 필터가 paid_at + status 조건으로 scan함.
-- partial index로 해당 상태의 주문만 인덱싱 → 테이블이 커져도 full scan 회피.

CREATE INDEX IF NOT EXISTS idx_orders_paid_at
  ON orders (paid_at)
  WHERE status IN ('paid', 'preparing');

CREATE INDEX IF NOT EXISTS idx_orders_escalated_at
  ON orders (escalated_at)
  WHERE escalated_at IS NOT NULL;
