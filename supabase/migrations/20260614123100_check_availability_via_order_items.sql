-- Migration: check_artwork_availability의 pending 카운트를 order_items 조인 기준으로 변경.
-- 다품목 주문은 orders.artwork_id가 NULL이므로 order_items에서 작품별 수량을 합산해야 한다.
-- 단건 주문도 20260614123000 백필로 order_items 1행을 가지므로 동일하게 집계된다.

CREATE OR REPLACE FUNCTION public.check_artwork_availability(
  p_artwork_id uuid,
  p_exclude_order_id uuid DEFAULT NULL
)
RETURNS TABLE(
  is_available boolean,
  artwork_edition_type text,
  artwork_edition_limit integer,
  sold_count bigint,
  pending_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_artwork RECORD;
  v_sold_count bigint;
  v_pending_count bigint;
BEGIN
  SELECT a.edition_type::text, a.edition_limit, a.status
  INTO v_artwork
  FROM public.artworks a
  WHERE a.id = p_artwork_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::integer, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(s.quantity), 0)
  INTO v_sold_count
  FROM public.artwork_sales s
  WHERE s.artwork_id = p_artwork_id
    AND s.voided_at IS NULL;

  -- 변경점: orders.artwork_id 직접 비교 → order_items 조인 + 수량 합산.
  -- COUNT(*)가 아닌 SUM(oi.quantity): limited edition의 다수량 라인을 정확히 반영
  -- (unique는 createOrder가 quantity=1 강제라 기존 COUNT와 동치). order_items의
  -- UNIQUE(order_id, artwork_id) 제약이 주문당 작품 1행을 보장 → 조인 fan-out 없음.
  SELECT COALESCE(SUM(oi.quantity), 0)
  INTO v_pending_count
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE oi.artwork_id = p_artwork_id
    AND (p_exclude_order_id IS NULL OR o.id <> p_exclude_order_id)
    AND (
      (o.status = 'pending_payment' AND o.created_at > now() - interval '30 minutes')
      OR
      (o.status = 'awaiting_deposit' AND o.created_at > now() - interval '24 hours')
    );

  RETURN QUERY SELECT
    CASE
      WHEN v_artwork.status = 'sold' THEN false
      -- reserved는 unique edition에서만 unavailable 판정 (방어선 강화).
      -- limited/open은 status 'reserved'여도 edition_limit 안에서 추가 판매 가능해야 함.
      WHEN v_artwork.status = 'reserved' AND v_artwork.edition_type = 'unique' THEN false
      WHEN v_artwork.edition_type = 'unique'
        AND (v_sold_count + v_pending_count) >= 1 THEN false
      WHEN v_artwork.edition_type = 'limited'
        AND v_artwork.edition_limit IS NOT NULL
        AND (v_sold_count + v_pending_count) >= v_artwork.edition_limit THEN false
      ELSE true
    END,
    v_artwork.edition_type,
    v_artwork.edition_limit,
    v_sold_count,
    v_pending_count;
END;
$function$;

-- 적용 후 검증: 미판매 unique 작품 1건의 RPC 호출 → is_available=true 확인.
--   SELECT * FROM check_artwork_availability('<available_unique_artwork_id>');
