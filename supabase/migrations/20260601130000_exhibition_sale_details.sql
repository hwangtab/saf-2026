-- SAF 2026 offline exhibition buyer/shipping details.
-- Keeps PII out of public/member surfaces while preserving admin operations data.

CREATE TABLE IF NOT EXISTS public.exhibition_sale_details (
  sale_id uuid PRIMARY KEY REFERENCES public.artwork_sales(id) ON DELETE CASCADE,
  shipping_address text,
  delivery_status text,
  release_status text,
  purchase_channel text,
  paid_status text,
  artwork_price integer NOT NULL DEFAULT 0 CHECK (artwork_price >= 0),
  artist_share integer NOT NULL DEFAULT 0 CHECK (artist_share >= 0),
  exhibitor_name text,
  purchase_date text,
  shipping_required text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS artwork_sales_import_batch_row_uidx
  ON public.artwork_sales (import_batch_id, import_row_no)
  WHERE import_batch_id IS NOT NULL AND import_row_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS exhibition_sale_details_purchase_channel_idx
  ON public.exhibition_sale_details (purchase_channel);

CREATE INDEX IF NOT EXISTS exhibition_sale_details_delivery_status_idx
  ON public.exhibition_sale_details (delivery_status);

ALTER TABLE public.exhibition_sale_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage exhibition sale details" ON public.exhibition_sale_details;
CREATE POLICY "Admins can manage exhibition sale details"
  ON public.exhibition_sale_details
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exhibition_sale_details TO service_role;

COMMENT ON TABLE public.exhibition_sale_details IS
  'Admin-only SAF 2026 offline exhibition buyer shipping and settlement metadata linked 1:1 to artwork_sales.';
COMMENT ON COLUMN public.exhibition_sale_details.shipping_address IS
  'PII: offline exhibition buyer shipping address. Admin/service-role only.';
COMMENT ON COLUMN public.exhibition_sale_details.raw_payload IS
  'Original CSV row payload for audit and reconciliation.';
