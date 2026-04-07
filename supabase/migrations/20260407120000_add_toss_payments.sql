-- ============================================================
-- Migration: TossPayments v2 Widget Integration
-- Tables: orders, payments
-- Changes: artwork_sales source/source_detail constraint expansion
-- ============================================================

-- ============================================================
-- 1. Create orders table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_no text NOT NULL UNIQUE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id),
  quantity integer NOT NULL DEFAULT 1,
  -- Buyer info
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_user_id uuid REFERENCES auth.users(id),
  -- Shipping
  shipping_name text NOT NULL,
  shipping_phone text NOT NULL,
  shipping_address text NOT NULL,
  shipping_address_detail text,
  shipping_postal_code text NOT NULL,
  shipping_memo text,
  -- Amounts (KRW, integer only)
  item_amount integer NOT NULL,
  shipping_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL,
  -- Order status machine
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', 'paid', 'preparing', 'shipped',
      'delivered', 'completed', 'cancelled', 'refund_requested', 'refunded'
    )),
  paid_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  note text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_artwork_id ON public.orders(artwork_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_user_id ON public.orders(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- RLS for orders (admin-only read/write; API routes use service_role)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Buyers can read their own orders (logged-in only)
CREATE POLICY "Buyers can view own orders" ON public.orders
  FOR SELECT USING (
    buyer_user_id IS NOT NULL AND buyer_user_id = auth.uid()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;

-- updated_at trigger for orders
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();

-- ============================================================
-- 2. Create payments table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  payment_key text NOT NULL UNIQUE,
  toss_order_id text NOT NULL,
  method text,           -- CARD, TRANSFER, VIRTUAL_ACCOUNT, MOBILE_PHONE
  method_detail jsonb,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'KRW',
  status text NOT NULL DEFAULT 'READY'
    CHECK (status IN (
      'READY', 'IN_PROGRESS', 'WAITING_FOR_DEPOSIT',
      'DONE', 'CANCELED', 'PARTIAL_CANCELED', 'ABORTED', 'EXPIRED'
    )),
  approved_at timestamptz,
  cancelled_at timestamptz,
  confirm_response jsonb,
  webhook_responses jsonb[] DEFAULT ARRAY[]::jsonb[],
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_toss_order_id ON public.payments(toss_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO service_role;

-- updated_at trigger for payments (reuse the same function)
CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();

-- ============================================================
-- 3. Expand artwork_sales source constraint to include 'toss'
-- ============================================================
ALTER TABLE public.artwork_sales DROP CONSTRAINT IF EXISTS artwork_sales_source_check;
ALTER TABLE public.artwork_sales ADD CONSTRAINT artwork_sales_source_check
  CHECK (source IN ('manual', 'cafe24', 'toss'));

ALTER TABLE public.artwork_sales DROP CONSTRAINT IF EXISTS artwork_sales_source_detail_check;
ALTER TABLE public.artwork_sales ADD CONSTRAINT artwork_sales_source_detail_check
  CHECK (
    source_detail IN ('manual', 'manual_csv', 'cafe24_api', 'legacy_csv', 'toss_api')
    OR source_detail IS NULL
  );

-- Link artwork_sales back to orders (nullable for manual/cafe24 records)
ALTER TABLE public.artwork_sales
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id);

CREATE INDEX IF NOT EXISTS idx_artwork_sales_order_id ON public.artwork_sales(order_id);

-- ============================================================
-- 4. RPC: check artwork availability with SELECT FOR UPDATE
-- ============================================================
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

  -- Count pending orders in last 30 minutes (reservation window)
  SELECT COUNT(*)
  INTO v_pending_count
  FROM public.orders o
  WHERE o.artwork_id = p_artwork_id
    AND o.status = 'pending_payment'
    AND o.created_at > now() - interval '30 minutes';

  RETURN QUERY SELECT
    CASE
      WHEN v_artwork.status = 'sold' THEN false
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

-- ============================================================
-- 5. Comments
-- ============================================================
COMMENT ON TABLE public.orders IS 'SAF 2026 purchase orders (TossPayments v2)';
COMMENT ON TABLE public.payments IS 'TossPayments payment records linked to orders';
COMMENT ON COLUMN public.orders.order_no IS 'SAF-YYYYMMDD-XXXX format, unique per order';
COMMENT ON COLUMN public.orders.item_amount IS 'Artwork price in KRW (integer, from artworks.price)';
COMMENT ON COLUMN public.orders.shipping_amount IS '0 if free shipping (>=200000 KRW), else 4000 KRW';
COMMENT ON COLUMN public.payments.payment_key IS 'TossPayments paymentKey, globally unique';
COMMENT ON COLUMN public.payments.toss_order_id IS 'Our order_no sent to Toss as orderId';
COMMENT ON FUNCTION public.check_artwork_availability IS 'Checks if artwork can be purchased; uses SELECT FOR UPDATE to prevent overselling';
