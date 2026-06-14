-- 다품목(장바구니) 주문 지원: orders.artwork_id를 nullable로 변경.
--
-- 배경: createOrder가 items[]를 받아 다품목 주문을 만들 수 있게 확장됨.
--   - 단건 주문: 기존과 동일하게 orders.artwork_id = 해당 작품 (호환 보존)
--   - 다건 주문: orders.artwork_id = NULL, 품목 상세는 order_items에 기록
-- 따라서 orders.artwork_id의 NOT NULL 제약을 해제해야 한다.
--
-- 안전성: 기존 단건 주문은 모두 artwork_id가 채워져 있으므로 데이터 영향 없음.
--   nullable 완화는 기존 row를 건드리지 않는다.

ALTER TABLE public.orders ALTER COLUMN artwork_id DROP NOT NULL;
