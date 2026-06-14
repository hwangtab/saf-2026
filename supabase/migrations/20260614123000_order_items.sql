-- supabase/migrations/20260614123000_order_items.sql
--
-- 주문 다품목화: order_items 테이블 추가 + 기존 주문 백필.
--
-- orders 테이블은 헤더(합계·상태·구매자)로 유지하고,
-- 품목 상세(작품·수량·시점가격)를 order_items로 정규화한다.
-- 기존 단건 주문(orders.artwork_id IS NOT NULL)은 1행씩 백필한다.
--
-- ⚠️ production 적용 전 사용자 컨펌 필수.

-- ----------------------------------------------------------------------------
-- 1) order_items 테이블
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artwork_id uuid        NOT NULL REFERENCES public.artworks(id),
  quantity   integer     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price integer     NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id  ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_artwork_id ON public.order_items(artwork_id);

-- ----------------------------------------------------------------------------
-- 2) RLS: 본인 주문의 품목만 조회. service_role은 RLS 우회.
-- ----------------------------------------------------------------------------
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own order items" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.buyer_user_id IS NOT NULL
        AND o.buyer_user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO service_role;
-- 참고: authenticated 역할용 INSERT/UPDATE/DELETE 정책은 아직 없다. 주문 생성은
-- service_role(서버 액션)이 수행하므로 현재 불필요. 장바구니 계획 2에서 cart_items를
-- 다루되, order_items에 buyer-facing 쓰기 경로가 생기면 그때 정책을 추가한다.

-- ----------------------------------------------------------------------------
-- 3) 백필: 기존 주문 1건당 order_items 1행.
--    unit_price = item_amount / quantity (정수 나눗셈; 단가 = 총액 ÷ 수량).
--    기존 모든 orders는 quantity=1(createOrder가 항상 1로 INSERT, 스키마 DEFAULT 1)이라
--    정수 나눗셈 손실 없음: unit_price = item_amount.
--    GREATEST(quantity, 1): quantity가 0인 레거시 행을 0-division에서 보호.
--    idempotent: order_id에 이미 행이 있으면 재삽입하지 않는다.
-- ----------------------------------------------------------------------------
INSERT INTO public.order_items (order_id, artwork_id, quantity, unit_price, created_at)
SELECT
  o.id,
  o.artwork_id,
  o.quantity,
  (o.item_amount / GREATEST(o.quantity, 1))::integer,
  o.created_at
FROM public.orders o
WHERE o.artwork_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id
  );

-- ----------------------------------------------------------------------------
-- 적용 후 수동 검증 (MCP execute_sql, 읽기전용):
--
--   SELECT count(*) FROM orders WHERE artwork_id IS NOT NULL;
--   -- A
--
--   SELECT count(DISTINCT order_id) FROM order_items;
--   -- A와 동일해야 함
--
--   SELECT o.id FROM orders o
--   WHERE o.artwork_id IS NOT NULL
--     AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id);
--   -- 0행이어야 함
-- ----------------------------------------------------------------------------
