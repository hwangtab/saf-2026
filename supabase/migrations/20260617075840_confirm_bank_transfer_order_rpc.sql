-- Manual bank-transfer confirmation must not leave orders paid without matching
-- artwork_sales. Keep sale insertion and order status transition in one DB
-- transaction so trigger/constraint failures roll the whole operation back.

CREATE OR REPLACE FUNCTION public.confirm_bank_transfer_order(
  p_order_id uuid,
  p_sold_at timestamptz DEFAULT now()
)
RETURNS TABLE (
  order_id uuid,
  order_no text,
  artwork_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_artwork_ids uuid[];
BEGIN
  SELECT *
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_order.status <> 'awaiting_deposit' THEN
    RAISE EXCEPTION 'INVALID_ORDER_STATUS:%', v_order.status USING ERRCODE = 'P0001';
  END IF;

  WITH raw_line_items AS (
    SELECT
      oi.artwork_id,
      GREATEST(COALESCE(oi.quantity, 1), 1)::integer AS quantity,
      COALESCE(oi.unit_price, 0)::integer AS unit_price
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id

    UNION ALL

    SELECT
      v_order.artwork_id,
      1,
      COALESCE(v_order.total_amount, 0)::integer
    WHERE v_order.artwork_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
      )
  ),
  line_items AS (
    SELECT artwork_id, quantity, unit_price
    FROM raw_line_items
    WHERE artwork_id IS NOT NULL
  )
  SELECT array_agg(artwork_id ORDER BY artwork_id)
    INTO v_artwork_ids
    FROM line_items;

  IF COALESCE(array_length(v_artwork_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'NO_LINE_ITEMS' USING ERRCODE = 'P0001';
  END IF;

  WITH raw_line_items AS (
    SELECT
      oi.artwork_id,
      GREATEST(COALESCE(oi.quantity, 1), 1)::integer AS quantity,
      COALESCE(oi.unit_price, 0)::integer AS unit_price
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id

    UNION ALL

    SELECT
      v_order.artwork_id,
      1,
      COALESCE(v_order.total_amount, 0)::integer
    WHERE v_order.artwork_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
      )
  ),
  line_items AS (
    SELECT artwork_id, quantity, unit_price
    FROM raw_line_items
    WHERE artwork_id IS NOT NULL
  )
  INSERT INTO public.artwork_sales (
    artwork_id,
    sale_price,
    quantity,
    source,
    source_detail,
    order_id,
    external_order_id,
    buyer_name,
    buyer_phone,
    sold_at
  )
  SELECT
    li.artwork_id,
    li.unit_price,
    li.quantity,
    'manual',
    'bank_transfer',
    v_order.id,
    v_order.order_no,
    v_order.buyer_name,
    v_order.buyer_phone,
    p_sold_at
  FROM line_items li
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.artwork_sales s
    WHERE s.order_id = v_order.id
      AND s.artwork_id = li.artwork_id
      AND s.voided_at IS NULL
  );

  UPDATE public.orders
     SET status = 'paid',
         paid_at = p_sold_at,
         updated_at = p_sold_at
   WHERE id = p_order_id
     AND status = 'awaiting_deposit';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_STATUS_CHANGED' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT v_order.id, v_order.order_no, v_artwork_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_bank_transfer_order(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_bank_transfer_order(uuid, timestamptz) TO service_role;

COMMENT ON FUNCTION public.confirm_bank_transfer_order(uuid, timestamptz) IS
  'Atomically records artwork_sales and marks an awaiting_deposit order as paid for admin bank-transfer confirmation.';
