-- Add admin_product_name column for distinguishing same-title artworks
-- Maps to Cafe24's internal_product_name (상품명(관리용))
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS admin_product_name text;
