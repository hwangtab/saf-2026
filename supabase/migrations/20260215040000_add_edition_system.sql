-- 1. Create Edition Type Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'edition_type') THEN
    CREATE TYPE public.edition_type AS ENUM ('unique', 'limited', 'open');
  END IF;
END $$;

-- 2. Add Columns to Artworks
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
