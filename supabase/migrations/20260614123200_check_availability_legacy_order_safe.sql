-- Migration: check_artwork_availability 전환기 안전형 — pending 집계를
-- order_items(신규 주문) + legacy orders.artwork_id(order_items 없는 구코드 주문) 양쪽으로 센다.
--
-- 배경: order_items 기반 RPC(20260614123100)는 모든 주문이 order_items를 갖는다고 가정한다.
-- 그러나 마이그레이션 적용 시점과 신규 코드(createOrder가 order_items 기록) 배포 시점 사이에는
-- 구버전 코드가 order_items 없이 주문을 생성한다. 그 주문은 order_items 조인에서 누락되어
-- pending_count에 잡히지 않고, 결제 진행 중인 unique 작품이 "판매 가능"으로 보여 이중판매 창이
-- 열린다. 이 정의는 order_items 없는 주문을 orders.artwork_id로 보강 집계해 창을 닫는다.
--
-- 중복 집계 방지: 신규 단건 주문은 artwork_id와 order_items를 모두 갖지만, second SELECT의
-- NOT EXISTS(order_items) 가드로 first SELECT(order_items)에서만 1회 집계된다.

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

  -- pending: order_items 기반(신규) + legacy artwork_id 기반(order_items 없는 구코드 주문)
  SELECT COALESCE(SUM(qty), 0)
  INTO v_pending_count
  FROM (
    SELECT oi.quantity AS qty
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE oi.artwork_id = p_artwork_id
      AND (p_exclude_order_id IS NULL OR o.id <> p_exclude_order_id)
      AND (
        (o.status = 'pending_payment' AND o.created_at > now() - interval '30 minutes')
        OR
        (o.status = 'awaiting_deposit' AND o.created_at > now() - interval '24 hours')
      )
    UNION ALL
    SELECT o.quantity AS qty
    FROM public.orders o
    WHERE o.artwork_id = p_artwork_id
      AND NOT EXISTS (SELECT 1 FROM public.order_items oi2 WHERE oi2.order_id = o.id)
      AND (p_exclude_order_id IS NULL OR o.id <> p_exclude_order_id)
      AND (
        (o.status = 'pending_payment' AND o.created_at > now() - interval '30 minutes')
        OR
        (o.status = 'awaiting_deposit' AND o.created_at > now() - interval '24 hours')
      )
  ) AS pending_qty;

  RETURN QUERY SELECT
    CASE
      WHEN v_artwork.status = 'sold' THEN false
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
