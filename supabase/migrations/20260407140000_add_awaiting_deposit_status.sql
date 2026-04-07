-- Migration: orders.status CHECK 제약조건에 'awaiting_deposit' 추가
-- 가상계좌 결제 시 입금 대기 상태를 별도 상태로 관리하여 30분 cron에 의해 취소되는 문제 방지

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending_payment',
    'awaiting_deposit',
    'paid',
    'preparing',
    'shipped',
    'delivered',
    'completed',
    'cancelled',
    'refund_requested',
    'refunded'
  ));
