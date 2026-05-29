-- Migration: check_artwork_availability RPC의 reserved 분기에 edition_type='unique' 가드 추가.
--
-- 배경: 가상계좌 reserved 잠금 버그(직전 commit 6c01ff4e) 수정으로 이제 unique edition만
-- reserved 처리되지만, RPC의 `WHEN v_artwork.status = 'reserved' THEN false` 분기는 모든
-- edition_type에 적용. admin이 운영 실수로 open/limited 작품을 reserved로 직접 설정하거나
-- 향후 다른 코드 경로가 잘못 reserved 처리하면 즉시 unavailable이 되어 모든 구매가 차단됨.
-- 방어선 강화: reserved 자체로 unavailable 판정은 unique edition에 한정.

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
