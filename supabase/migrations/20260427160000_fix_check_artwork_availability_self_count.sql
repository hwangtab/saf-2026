-- Migration: check_artwork_availability에 p_exclude_order_id 파라미터 추가하여
-- 자기 자신을 pending_count에 포함시키는 버그 수정.
--
-- 배경: confirm route가 Toss 결제 승인 직전에 availability를 재확인하는데,
-- 현재 주문은 아직 'pending_payment' 상태이므로 자기 자신이 pending_count에 포함된다.
-- edition_type='unique' 작품은 (sold=0 + pending=1) >= 1로 즉시 unavailable 판정 → 409 반환.
-- CARD/위젯 플로우에서 unique edition 작품 결제 시 항상 실패하던 사전 존재 버그.
--
-- 수정: optional p_exclude_order_id 인자를 받아 해당 주문은 pending_count에서 제외.
-- createOrder 시점(주문 INSERT 전)에는 NULL을 넘겨 기존 동작 유지.
-- confirm route는 order.id를 넘겨 자기 자신을 제외.

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
AS $function$
DECLARE
  v_artwork RECORD;
  v_sold_count bigint;
  v_pending_count bigint;
BEGIN
  -- Lock the artwork row to prevent concurrent modification
  SELECT a.edition_type::text, a.edition_limit, a.status
  INTO v_artwork
  FROM public.artworks a
  WHERE a.id = p_artwork_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::integer, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  -- Count confirmed sales (not voided)
  SELECT COALESCE(SUM(s.quantity), 0)
  INTO v_sold_count
  FROM public.artwork_sales s
  WHERE s.artwork_id = p_artwork_id
    AND s.voided_at IS NULL;

  -- Count active reservations:
  --   pending_payment: last 30 minutes (Toss checkout window)
  --   awaiting_deposit: last 24 hours (bank transfer expiry window)
  -- p_exclude_order_id가 주어지면 해당 주문은 자기 자신이므로 카운트에서 제외.
  SELECT COUNT(*)
  INTO v_pending_count
  FROM public.orders o
  WHERE o.artwork_id = p_artwork_id
    AND (p_exclude_order_id IS NULL OR o.id <> p_exclude_order_id)
    AND (
      (o.status = 'pending_payment' AND o.created_at > now() - interval '30 minutes')
      OR
      (o.status = 'awaiting_deposit' AND o.created_at > now() - interval '24 hours')
    );

  RETURN QUERY SELECT
    CASE
      WHEN v_artwork.status = 'sold' THEN false
      WHEN v_artwork.status = 'reserved' THEN false
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
