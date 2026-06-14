-- Migration: artwork_sales 활성 유니크 제약을 (order_id) → (order_id, artwork_id)로 변경.
--
-- 배경: 다품목 주문은 한 order_id에 작품별로 artwork_sales N행을 기록한다(recordOrderArtworkSales).
-- 그러나 기존 부분 유니크 인덱스 2개가 (order_id) WHERE voided_at IS NULL 단독이라, 같은 order_id로
-- N행을 INSERT하면 위반되어 전체 batch INSERT가 실패한다 → 다품목 주문은 결제는 되고 매출이
-- 0건 기록되는 CRITICAL 버그. (단건 주문은 1행이라 지금까지 노출 안 됨.)
--
-- 변경: 중복 인덱스 2개를 (order_id, artwork_id) 활성 유니크 1개로 교체.
--   - 다품목 주문의 작품별 1행은 허용(서로 다른 artwork_id)
--   - 동일 주문·동일 작품 중복 매출은 여전히 차단(멱등 보장)
--
-- 안전성: 기존 데이터는 order당 active 매출 1행뿐이라 (order_id, artwork_id) 충돌 0건(적용 전 검증).

DROP INDEX IF EXISTS public.artwork_sales_one_active_per_order;
DROP INDEX IF EXISTS public.artwork_sales_order_id_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS artwork_sales_active_per_order_artwork
  ON public.artwork_sales (order_id, artwork_id)
  WHERE (order_id IS NOT NULL AND voided_at IS NULL);
