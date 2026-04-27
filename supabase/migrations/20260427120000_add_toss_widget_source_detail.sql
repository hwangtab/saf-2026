-- Migration: artwork_sales.source_detail 제약조건에 'toss_widget' 추가
-- Toss 결제위젯(신규 MID)으로 처리된 결제는 source_detail='toss_widget'로 기록되어
-- 기존 'toss_api' (cafe24 경유 MID, 개별 연동 키)와 운영/리포팅에서 구분된다.

ALTER TABLE public.artwork_sales DROP CONSTRAINT IF EXISTS artwork_sales_source_detail_check;
ALTER TABLE public.artwork_sales ADD CONSTRAINT artwork_sales_source_detail_check
  CHECK (
    source_detail IN (
      'manual',
      'manual_csv',
      'cafe24_api',
      'legacy_csv',
      'toss_api',
      'bank_transfer',
      'toss_widget'
    )
    OR source_detail IS NULL
  );
