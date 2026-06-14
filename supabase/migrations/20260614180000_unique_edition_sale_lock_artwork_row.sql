-- enforce_unique_edition_single_active_sale 트리거 강화: 작품 행을 FOR UPDATE로 잠가
-- 동시 INSERT를 직렬화한다.
--
-- 배경: 기존 트리거는 plain SELECT count(*)로 active 매출을 셌다. READ COMMITTED에서
-- 두 INSERT가 겹치는 순간 둘 다 count=0 스냅샷을 보고 통과 → unique 작품 더블셀이 확률적으로
-- 새어나갈 수 있었다((order_id, artwork_id) 유니크 인덱스는 서로 다른 주문은 못 막음).
-- 작품 행을 FOR UPDATE로 잠그면 두 번째 INSERT의 트리거가 첫 INSERT 커밋까지 대기 → 그 후
-- count가 커밋된 매출을 보고 RAISE. 더블셀을 결정적으로 차단.
--
-- 잠금 비용: artwork_sales INSERT마다 해당 작품 행 1건 잠금(브리프). 저볼륨 사이트라 미미.

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
  -- 작품 행 잠금: 같은 작품에 동시 매출 INSERT를 직렬화(TOCTOU 차단).
  SELECT a.edition_type::text INTO v_edition_type
  FROM public.artworks a WHERE a.id = NEW.artwork_id FOR UPDATE;
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
