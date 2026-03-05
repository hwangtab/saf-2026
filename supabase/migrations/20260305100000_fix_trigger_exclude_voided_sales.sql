-- Fix: voided 판매를 SUM에서 제외하여 premature sold 상태 방지
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
  FROM public.artwork_sales
  WHERE artwork_id = NEW.artwork_id
    AND voided_at IS NULL;              -- voided 판매 제외

  IF artwork_edition_type = 'unique' AND total_quantity_sold >= 1 THEN
    UPDATE public.artworks SET status = 'sold' WHERE id = NEW.artwork_id;
  ELSIF artwork_edition_type = 'limited' AND artwork_edition_limit IS NOT NULL
        AND total_quantity_sold >= artwork_edition_limit THEN
    UPDATE public.artworks SET status = 'sold' WHERE id = NEW.artwork_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
