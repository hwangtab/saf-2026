
-- Phase 1: Cafe24 레거시 DB 오브젝트 전량 제거
-- Toss 결제 전환 완료에 따른 정리

-- 1. artwork_sales의 cafe24 인덱스 제거
DROP INDEX IF EXISTS artwork_sales_cafe24_item_code_uidx;

-- 2. artworks 테이블의 cafe24 인덱스 제거 (컬럼 DROP 전에)
DROP INDEX IF EXISTS artworks_cafe24_product_no_idx;
DROP INDEX IF EXISTS artworks_cafe24_custom_product_code_idx;
DROP INDEX IF EXISTS artworks_cafe24_sync_status_idx;

-- 3. artworks 테이블의 cafe24 컬럼 제거
ALTER TABLE artworks DROP COLUMN IF EXISTS cafe24_product_no;
ALTER TABLE artworks DROP COLUMN IF EXISTS cafe24_custom_product_code;
ALTER TABLE artworks DROP COLUMN IF EXISTS cafe24_sync_status;
ALTER TABLE artworks DROP COLUMN IF EXISTS cafe24_sync_error;
ALTER TABLE artworks DROP COLUMN IF EXISTS cafe24_synced_at;

-- 4. Cafe24 전용 테이블 제거
DROP TABLE IF EXISTS cafe24_sales_sync_failed_orders;
DROP TABLE IF EXISTS cafe24_sales_sync_state;
DROP TABLE IF EXISTS cafe24_oauth_contexts;
DROP TABLE IF EXISTS cafe24_tokens;
;
