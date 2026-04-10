-- Partial unique index on artwork_sales(order_id) to prevent duplicate sales records
-- for the same order. Covers Toss and bank-transfer orders.
-- Excludes: order_id IS NULL (manual/import entries), voided_at IS NOT NULL (voided sales)
CREATE UNIQUE INDEX IF NOT EXISTS artwork_sales_order_id_uidx
  ON public.artwork_sales (order_id)
  WHERE order_id IS NOT NULL AND voided_at IS NULL;
