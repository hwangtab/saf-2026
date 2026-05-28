-- Migration: artwork_sales_status_sync 트리거에 UPDATE 이벤트 추가.
--
-- 배경: 20260215040000_add_edition_system.sql의 트리거는 AFTER INSERT ON public.artwork_sales로
-- 선언됨. 20260305100000_fix_trigger_exclude_voided_sales.sql은 함수 본문만 교체했고
-- DROP/CREATE TRIGGER를 생략해 이벤트 정의가 INSERT-only로 잔존.
--
-- 위험: artwork_sales.voided_at = now() UPDATE가 발생해도 트리거가 발화하지 않아 artwork
-- 상태가 영구 sold로 잠긴다. 현재는 deriveAndSyncArtworkStatus 보정 호출에 전적 의존이라
-- 그 호출이 빠진 직접 SQL/migration backfill 경로에서 회귀 위험. INSERT OR UPDATE로 확장해
-- DB 레벨 안전망을 복원.

DROP TRIGGER IF EXISTS artwork_sales_status_sync ON public.artwork_sales;
CREATE TRIGGER artwork_sales_status_sync
  AFTER INSERT OR UPDATE ON public.artwork_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_artwork_status_on_sale();
