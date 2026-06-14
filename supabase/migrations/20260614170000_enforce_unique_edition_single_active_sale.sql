-- unique 에디션 작품은 active(voided_at IS NULL) artwork_sales가 작품당 1건만 존재해야 한다.
-- 기존 (order_id, artwork_id) 유니크는 같은 주문 내 중복만 막고, 서로 다른 주문이 같은 unique
-- 작품을 동시에 기록하는 더블셀은 못 막는다. 이 트리거가 그 갭을 닫는다.
-- 메시지에 'UNIQUE_EDITION_TAKEN' 센티넬 포함 → 앱이 동일주문 23505와 구분.
CREATE OR REPLACE FUNCTION public.enforce_unique_edition_single_active_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_edition_type text;
  v_existing bigint;
BEGIN
  IF NEW.voided_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT a.edition_type::text INTO v_edition_type FROM public.artworks a WHERE a.id = NEW.artwork_id;
  IF v_edition_type IS DISTINCT FROM 'unique' THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_existing
  FROM public.artwork_sales s
  WHERE s.artwork_id = NEW.artwork_id
    AND s.voided_at IS NULL
    AND s.order_id IS DISTINCT FROM NEW.order_id;
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'UNIQUE_EDITION_TAKEN: artwork % already has an active sale', NEW.artwork_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_unique_edition_single_active_sale ON public.artwork_sales;
CREATE TRIGGER trg_enforce_unique_edition_single_active_sale
  BEFORE INSERT ON public.artwork_sales
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_edition_single_active_sale();
