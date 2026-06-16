-- Migration: update_artwork_status_on_sale의 void 복구 분기가 sold_at을 항상 클리어하도록 수정 + 기존 stale 보정.
--
-- 배경: 20260529170000이 추가한 ELSE(환불·void 복구) 분기는
--   SET status='available', sold_at=NULL WHERE id=NEW.artwork_id AND status='sold'
-- 처럼 sold_at 클리어를 `status='sold'` 가드에 묶었다. 그러나 artwork_sales에 걸린 다른 트리거나
-- 다품목 환불(한 주문의 여러 sale을 연속 void)에서 해당 작품 status가 이미 'available'로 전환된
-- 뒤 이 분기가 돌면 WHERE가 안 맞아 status는 available인데 sold_at만 남는 stale 상태가 된다.
--
-- 영향: 공개 trust signal이 sold_at 기반이라 오염됨.
--   - getRecentlySoldArtworks: `sold_at IS NOT NULL ORDER BY sold_at DESC` → available 작품이 "최근 판매작"에 노출
--   - getTotalSoldCount: `sold_at IS NOT NULL` 카운트 → available 작품이 "총 판매수"에 과다 집계
-- (2026-06-16 다품목 카트 실결제 스모크의 환불에서 재현 — 카트가 만든 버그가 아니라 5/29 트리거
--  엣지케이스를 다품목 환불이 노출. status는 cart availability·sold 배지의 권위 출처라 기능 영향 없음.)
--
-- 불변식: sold_at IS NOT NULL  ⟺  status = 'sold'. 판매·환불 이력은 artwork_sales에 보존되므로
-- 파생 메타인 artworks.sold_at 제거는 무손실.

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
    -- 환불·void로 판매 합산이 줄어 재구매 가능 — sold였다면 available로 복원.
    -- sold_at은 `status='sold'` 조건에 묶지 않고 항상 클리어: 다른 트리거가 먼저 status를
    -- available로 바꿨거나(다품목 환불 레이스) 이미 available인데 sold_at만 남은 stale도 정리.
    -- status는 'sold'일 때만 'available'로 내리고 그 외 값(reserved 등)은 보존.
    UPDATE public.artworks
       SET status = CASE WHEN status = 'sold' THEN 'available' ELSE status END,
           sold_at = NULL
     WHERE id = NEW.artwork_id
       AND (status = 'sold' OR sold_at IS NOT NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_catalog;

-- 기존 데이터 보정: 위 가드 버그로 누적된 stale sold_at 정리(불변식 복원).
-- status<>'sold'인데 sold_at이 남은 모든 작품 → sold_at=NULL.
UPDATE public.artworks
   SET sold_at = NULL
 WHERE status <> 'sold' AND sold_at IS NOT NULL;
