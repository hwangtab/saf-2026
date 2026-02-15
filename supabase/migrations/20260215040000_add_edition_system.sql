-- Migration: Add Edition-based artwork system and sales tracking
-- Created: 2026-02-15 04:00:00
-- Description: 
-- 1. Adds edition_type and edition_limit to artworks
-- 2. Creates artwork_sales table for tracking individual sales
-- 3. Backfills sales data for existing 'sold' artworks
-- 4. Implements trigger to automatically update artwork status based on sales

-- 1. Create Edition Type Enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'edition_type') THEN
    CREATE TYPE public.edition_type AS ENUM ('unique', 'limited', 'open');
  END IF;
END $$;

-- 2. Add Columns to Artworks
-- edition_type: unique (1/1), limited (fixed count), open (unlimited)
-- edition_limit: count for limited editions
ALTER TABLE public.artworks 
ADD COLUMN IF NOT EXISTS edition_type public.edition_type DEFAULT 'unique',
ADD COLUMN IF NOT EXISTS edition_limit integer;

-- 3. Create Sales Table
CREATE TABLE IF NOT EXISTS public.artwork_sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id uuid REFERENCES public.artworks(id) ON DELETE CASCADE NOT NULL,
  quantity integer DEFAULT 1 NOT NULL CHECK (quantity > 0),
  sale_price integer NOT NULL CHECK (sale_price >= 0),
  buyer_name text,
  note text,
  sold_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Indexes for performance and reporting
CREATE INDEX IF NOT EXISTS artwork_sales_artwork_id_idx ON public.artwork_sales(artwork_id);
CREATE INDEX IF NOT EXISTS artwork_sales_sold_at_idx ON public.artwork_sales(sold_at);

-- 5. RLS Policies
ALTER TABLE public.artwork_sales ENABLE ROW LEVEL SECURITY;

-- Public can see sales history (useful for transparency/social proof)
DROP POLICY IF EXISTS "Public can view sales" ON public.artwork_sales;
CREATE POLICY "Public can view sales" ON public.artwork_sales
  FOR SELECT USING (true);

-- Only admins can record or modify sales
DROP POLICY IF EXISTS "Admins can manage sales" ON public.artwork_sales;
CREATE POLICY "Admins can manage sales" ON public.artwork_sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Backfill Sales Data
-- Converts existing 'sold' status artworks into sales records.
-- Robust price parsing: removes currency symbols and commas, defaults to 0 if invalid.
-- Fallback for sold_at: updated_at -> created_at -> now()
INSERT INTO public.artwork_sales (artwork_id, sale_price, sold_at, quantity)
SELECT 
  id,
  COALESCE(
    CAST(NULLIF(REGEXP_REPLACE(COALESCE(price, '₩0'), '[^0-9]', '', 'g'), '') AS integer),
    0
  ) AS parsed_price,
  COALESCE(sold_at, updated_at, created_at, now()) AS sale_date,
  1
FROM public.artworks 
WHERE status = 'sold'
ON CONFLICT DO NOTHING;

-- 7. Set Edition Type for Specific Artists
-- Artists who primarily produce open-edition prints or reproductions
UPDATE public.artworks 
SET edition_type = 'open' 
WHERE artist_id IN (
  SELECT id FROM public.artists 
  WHERE name_ko IN ('오윤', '이윤엽', '류연복')
);

-- 8. Trigger Function to Sync Artwork Status
-- This ensures that when a sale is recorded, the parent artwork's status
-- is updated to 'sold' if it has reached its edition limit.
CREATE OR REPLACE FUNCTION public.update_artwork_status_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  sales_count integer;
  artwork_edition_type public.edition_type;
  artwork_edition_limit integer;
BEGIN
  -- 1. Fetch current artwork edition settings
  SELECT edition_type, edition_limit INTO artwork_edition_type, artwork_edition_limit
  FROM public.artworks WHERE id = NEW.artwork_id;

  -- 2. Calculate total sales (sum of quantities)
  SELECT COALESCE(SUM(quantity), 0) INTO sales_count
  FROM public.artwork_sales WHERE artwork_id = NEW.artwork_id;

  -- 3. Update status to 'sold' if limits reached
  -- Note: We only set to 'sold', never back to 'available' to prevent accidental reverts.
  -- 'unique' is treated as limit of 1.
  IF artwork_edition_type = 'unique' AND sales_count >= 1 THEN
    UPDATE public.artworks SET status = 'sold' WHERE id = NEW.artwork_id AND status != 'sold';
  ELSIF artwork_edition_type = 'limited' AND artwork_edition_limit IS NOT NULL AND sales_count >= artwork_edition_limit THEN
    UPDATE public.artworks SET status = 'sold' WHERE id = NEW.artwork_id AND status != 'sold';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create Trigger on sales table
DROP TRIGGER IF EXISTS artwork_sales_status_sync ON public.artwork_sales;
CREATE TRIGGER artwork_sales_status_sync
  AFTER INSERT OR UPDATE ON public.artwork_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_artwork_status_on_sale();

COMMENT ON FUNCTION public.update_artwork_status_on_sale() IS 'Synchronizes artworks.status with sales count based on edition type and limits.';


-- 4. Helper Function for Price Parsing
CREATE OR REPLACE FUNCTION public.parse_artwork_price(price_text text)
RETURNS integer AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(REGEXP_REPLACE(price_text, '[^0-9]', '', 'g'), '')::integer,
    0
  );
EXCEPTION
  WHEN OTHERS THEN RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Backfill Sales Data
WITH sold_artworks AS (
  SELECT 
    id,
    public.parse_artwork_price(price) as parsed_price,
    COALESCE(sold_at, updated_at, created_at) as sale_date
  FROM public.artworks
  WHERE status = 'sold'
)
INSERT INTO public.artwork_sales (artwork_id, sale_price, sold_at, quantity)
SELECT id, parsed_price, sale_date, 1
FROM sold_artworks
WHERE NOT EXISTS (
  SELECT 1 FROM public.artwork_sales s WHERE s.artwork_id = sold_artworks.id
);

-- 6. Update Artist-Specific Rules
UPDATE public.artworks 
SET edition_type = 'open'
WHERE artist_id IN (
  SELECT id FROM public.artists 
  WHERE name_ko IN ('오윤', '이윤엽', '류연복')
);

-- 7. Trigger Function to Sync Status
CREATE OR REPLACE FUNCTION public.update_artwork_status_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  total_quantity_sold integer;
  artwork_edition_type public.edition_type;
  artwork_edition_limit integer;
BEGIN
  SELECT edition_type, edition_limit INTO artwork_edition_type, artwork_edition_limit
  FROM public.artworks WHERE id = NEW.artwork_id;

  SELECT COALESCE(SUM(quantity), 0) INTO total_quantity_sold
  FROM public.artwork_sales WHERE artwork_id = NEW.artwork_id;

  IF artwork_edition_type = 'unique' AND total_quantity_sold >= 1 THEN
    UPDATE public.artworks SET status = 'sold' WHERE id = NEW.artwork_id;
  ELSIF artwork_edition_type = 'limited' AND artwork_edition_limit IS NOT NULL AND total_quantity_sold >= artwork_edition_limit THEN
    UPDATE public.artworks SET status = 'sold' WHERE id = NEW.artwork_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create Trigger
DROP TRIGGER IF EXISTS artwork_sales_status_sync ON public.artwork_sales;
CREATE TRIGGER artwork_sales_status_sync
  AFTER INSERT ON public.artwork_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_artwork_status_on_sale();

-- 9. Indexes
CREATE INDEX IF NOT EXISTS artwork_sales_artwork_id_idx ON public.artwork_sales(artwork_id);
CREATE INDEX IF NOT EXISTS artwork_sales_sold_at_idx ON public.artwork_sales(sold_at);

-- 10. RLS Policies
ALTER TABLE public.artwork_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view sales (no buyer info)" ON public.artwork_sales;
CREATE POLICY "Public can view sales (no buyer info)" 
  ON public.artwork_sales FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admins can manage sales" ON public.artwork_sales;
CREATE POLICY "Admins can manage sales" 
  ON public.artwork_sales FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
