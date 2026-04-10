-- Fix check_artwork_availability RPC:
-- 1) Treat 'reserved' status as unavailable (blocks duplicate bank-transfer orders)
-- 2) Count awaiting_deposit orders in pending_count (24-hour window matches expiry cron)

CREATE OR REPLACE FUNCTION public.check_artwork_availability(p_artwork_id uuid)
RETURNS TABLE (
  is_available boolean,
  artwork_edition_type text,
  artwork_edition_limit integer,
  sold_count bigint,
  pending_count bigint
) AS $$
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
  SELECT COUNT(*)
  INTO v_pending_count
  FROM public.orders o
  WHERE o.artwork_id = p_artwork_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
