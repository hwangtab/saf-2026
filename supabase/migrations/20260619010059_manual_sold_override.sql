-- Manual sold override protects operator-confirmed sell-outs from automatic
-- artwork_sales sync/void recovery. This is for open-edition or externally
-- managed inventory where "sold out" is an operator decision, not a quantity
-- derivation from artwork_sales.

ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS manual_sold_override boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.artworks.manual_sold_override IS
  'Admin/operator override: keep artwork sold even when artwork_sales sync would otherwise mark it available.';

CREATE OR REPLACE FUNCTION public.update_artwork_status_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  total_quantity_sold integer;
  artwork_edition_type public.edition_type;
  artwork_edition_limit integer;
  artwork_manual_sold_override boolean;
BEGIN
  SELECT edition_type, edition_limit, manual_sold_override
    INTO artwork_edition_type, artwork_edition_limit, artwork_manual_sold_override
  FROM public.artworks
  WHERE id = NEW.artwork_id;

  IF COALESCE(artwork_manual_sold_override, false) THEN
    UPDATE public.artworks
       SET status = 'sold',
           sold_at = COALESCE(sold_at, NEW.sold_at, now())
     WHERE id = NEW.artwork_id
       AND (status != 'sold' OR sold_at IS NULL);
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO total_quantity_sold
  FROM public.artwork_sales
  WHERE artwork_id = NEW.artwork_id AND voided_at IS NULL;

  IF artwork_edition_type = 'unique' AND total_quantity_sold >= 1 THEN
    UPDATE public.artworks
       SET status = 'sold', sold_at = COALESCE(sold_at, NEW.sold_at, now())
     WHERE id = NEW.artwork_id AND status != 'sold';
  ELSIF artwork_edition_type = 'limited'
        AND artwork_edition_limit IS NOT NULL
        AND total_quantity_sold >= artwork_edition_limit THEN
    UPDATE public.artworks
       SET status = 'sold', sold_at = COALESCE(sold_at, NEW.sold_at, now())
     WHERE id = NEW.artwork_id AND status != 'sold';
  ELSE
    UPDATE public.artworks
       SET status = CASE WHEN status = 'sold' THEN 'available' ELSE status END,
           sold_at = NULL
     WHERE id = NEW.artwork_id
       AND (status = 'sold' OR sold_at IS NOT NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.sync_artwork_sold_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.artworks
     SET sold_at = NEW.sold_at
   WHERE id = NEW.artwork_id
     AND status = 'sold'
     AND (sold_at IS NULL OR NEW.sold_at > sold_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_catalog;

UPDATE public.artworks
   SET status = 'sold',
       manual_sold_override = true,
       sold_at = COALESCE(sold_at, now()),
       updated_at = now()
 WHERE id = '4c920878-32dd-4727-ab03-6eda996597d5';
