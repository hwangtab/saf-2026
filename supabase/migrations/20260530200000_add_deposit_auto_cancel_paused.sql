-- 입금대기(awaiting_deposit) 주문의 자동취소 무한 보류 플래그.
--
-- 배경: expire-stale-orders cron이 created_at + 24시간 지난 awaiting_deposit 주문을 자동 취소한다.
-- 특수한 상황(고객이 입금을 늦게 하는 등)에서 관리자가 이 자동취소를 보류할 수 있어야 한다.
-- 이 플래그가 true이면 cron이 해당 주문을 만료 대상에서 제외 — 입금 확인하거나 수동 취소할 때까지
-- 계속 살아있다. 입금 확인(confirmDeposit)은 status만 보므로 보류와 무관하게 정상 진행된다.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deposit_auto_cancel_paused boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.deposit_auto_cancel_paused IS
  '관리자가 자동취소를 보류한 입금대기 주문 — expire-stale-orders cron이 만료 제외. 입금 기한 무한 연장.';
