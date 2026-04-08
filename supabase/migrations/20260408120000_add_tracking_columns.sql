-- Add shipping carrier and tracking number columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;
