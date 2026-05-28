-- Migration: update_artwork_status_on_sale에 void 시 sold→available 복구 로직 추가.
--
-- 배경: 직전 migration(20260529160000)이 트리거에 UPDATE 이벤트를 등록했고, 동일 시기
-- 20260305100000_fix_trigger_exclude_voided_sales.sql이 함수 본문에서 voided_at IS NULL
-- 조건으로 활성 판매만 합산하도록 수정했다. 그러나 함수는 'sold'로 전환만 수행하고
-- void로 인해 판매 합산이 줄어 다시 판매 가능해진 케이스의 'available' 복귀를 처리하지 않는다.
--
-- 결과: unique 작품이 판매 후 환불(voided_at 설정)되면 트리거가 fire되지만 함수가 sold 상태를
-- 그대로 두어 재구매가 막힌다. deriveAndSyncArtworkStatus 서버 액션이 보정하지만 DB 레벨
-- 안전망이 필요. UPDATE 이벤트가 트리거에 등록된 지금 함수도 복구 분기를 가져야 짝이 맞음.

CREATE OR REPLACE FUNCTION public.update_artwork_status_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  total_quantity_sold integer;
  artwork_edition_type public.edition_type;
  artwork_edition_limit integer;
BEGIN
  SELECT edition_type, edition_limit
    INTO artwork_edition_type, artwork_edition_limit
  FROM public.artworks
  WHERE id = NEW.artwork_id;

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
    -- 환불·void로 판매 합산이 줄어 재구매 가능 — sold였다면 available로 복원
    UPDATE public.artworks
       SET status = 'available', sold_at = NULL
     WHERE id = NEW.artwork_id AND status = 'sold';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_catalog;
