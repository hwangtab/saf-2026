-- 다품목 주문 정합성 보강:
-- 1) 같은 구매자의 오래된 pending_payment 주문을 order_items 기준으로도 정리.
-- 2) 특정 작품 구매자 audience count를 order_items 기준으로 재정의.

CREATE OR REPLACE FUNCTION public.cancel_stale_pending_orders_for_buyer_artworks(
  p_buyer_email text,
  p_artwork_ids uuid[],
  p_cutoff timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_buyer_email IS NULL OR btrim(p_buyer_email) = '' THEN
    RETURN 0;
  END IF;
  IF p_artwork_ids IS NULL OR array_length(p_artwork_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  WITH target_orders AS (
    SELECT DISTINCT o.id
    FROM public.orders o
    WHERE lower(btrim(o.buyer_email)) = lower(btrim(p_buyer_email))
      AND o.status = 'pending_payment'
      AND o.created_at < p_cutoff
      AND (
        o.artwork_id = ANY(p_artwork_ids)
        OR EXISTS (
          SELECT 1
          FROM public.order_items oi
          WHERE oi.order_id = o.id
            AND oi.artwork_id = ANY(p_artwork_ids)
        )
      )
  ),
  updated AS (
    UPDATE public.orders o
    SET
      status = 'cancelled',
      cancelled_at = COALESCE(o.cancelled_at, now()),
      updated_at = now()
    FROM target_orders t
    WHERE o.id = t.id
    RETURNING o.id
  )
  SELECT count(*)::integer INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_stale_pending_orders_for_buyer_artworks(text, uuid[], timestamptz)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_stale_pending_orders_for_buyer_artworks(text, uuid[], timestamptz)
  TO service_role;

-- 특정 작품 구매자 (artwork-buyer): order_items 기준 + payable 상태.
-- 다품목 주문은 orders.artwork_id가 NULL이므로 order_items를 단일 출처로 삼는다.
CREATE OR REPLACE FUNCTION public.count_artwork_buyer_audience(
  p_artwork_id text,
  p_advertising boolean,
  p_salt text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  WITH emails AS (
    SELECT DISTINCT lower(btrim(o.buyer_email)) AS e
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.artwork_id::text = p_artwork_id
      AND o.status IN ('paid', 'preparing', 'shipped', 'delivered')
      AND o.buyer_email IS NOT NULL
      AND btrim(o.buyer_email) <> ''
      AND (NOT p_advertising OR o.created_at >= now() - interval '180 days')
  )
  SELECT count(*)::int
  FROM emails em
  WHERE NOT EXISTS (
    SELECT 1 FROM public.email_suppressions s
    WHERE s.email_hash = public.hash_email(em.e, p_salt)
      AND s.channel IN ('customer', 'all')
  );
$$;

REVOKE ALL ON FUNCTION public.count_artwork_buyer_audience(text, boolean, text)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_artwork_buyer_audience(text, boolean, text)
  TO service_role;
