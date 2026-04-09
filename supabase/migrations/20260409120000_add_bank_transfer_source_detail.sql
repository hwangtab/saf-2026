-- Migration: artwork_sales.source_detail 제약조건에 'bank_transfer' 추가
-- 계좌이체 입금 확인 시 artwork_sales에 source_detail='bank_transfer'로 기록

ALTER TABLE public.artwork_sales DROP CONSTRAINT IF EXISTS artwork_sales_source_detail_check;
ALTER TABLE public.artwork_sales ADD CONSTRAINT artwork_sales_source_detail_check
  CHECK (
    source_detail IN ('manual', 'manual_csv', 'cafe24_api', 'legacy_csv', 'toss_api', 'bank_transfer')
    OR source_detail IS NULL
  );
