-- 동일 주문에 대한 active artwork_sales 중복 INSERT 차단.
-- 웹훅 멱등성 가드와 confirm 라우트 코드 레벨 가드의 DB-level 보강.
-- voided_at IS NULL 부분 unique이므로 환불 후 재판매 시나리오는 영향 없음.
-- order_id IS NULL인 레거시 manual sales(cafe24 import 등)도 영향 없음.
CREATE UNIQUE INDEX IF NOT EXISTS artwork_sales_one_active_per_order
  ON public.artwork_sales (order_id)
  WHERE voided_at IS NULL AND order_id IS NOT NULL;

COMMENT ON INDEX public.artwork_sales_one_active_per_order IS
  'Toss confirm/webhook 동시 실행 시 동일 order_id에 대한 중복 active sales 차단. 코드 리뷰 #2 후속 조치.';;
