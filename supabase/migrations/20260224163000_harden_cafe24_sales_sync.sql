-- Harden Cafe24 sales synchronization and revenue data integrity.
-- 1) artwork_sales: import idempotency + source detail + void support
-- 2) failed order queue for resilient cursor progress

ALTER TABLE public.artwork_sales
  ADD COLUMN IF NOT EXISTS import_batch_id text,
  ADD COLUMN IF NOT EXISTS import_row_no integer,
  ADD COLUMN IF NOT EXISTS source_detail text,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'artwork_sales_import_row_positive_check'
      AND conrelid = 'public.artwork_sales'::regclass
  ) THEN
    ALTER TABLE public.artwork_sales
      ADD CONSTRAINT artwork_sales_import_row_positive_check
      CHECK (import_row_no IS NULL OR import_row_no > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'artwork_sales_import_batch_row_unique'
      AND conrelid = 'public.artwork_sales'::regclass
  ) THEN
    ALTER TABLE public.artwork_sales
      ADD CONSTRAINT artwork_sales_import_batch_row_unique
      UNIQUE (import_batch_id, import_row_no);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'artwork_sales_source_detail_check'
      AND conrelid = 'public.artwork_sales'::regclass
  ) THEN
    ALTER TABLE public.artwork_sales
      ADD CONSTRAINT artwork_sales_source_detail_check
      CHECK (
        source_detail IN ('manual', 'manual_csv', 'cafe24_api', 'legacy_csv')
        OR source_detail IS NULL
      );
  END IF;
END $$;

UPDATE public.artwork_sales
SET source_detail = CASE
  WHEN source = 'cafe24' AND external_order_item_code IS NULL THEN 'legacy_csv'
  WHEN source = 'cafe24' THEN 'cafe24_api'
  ELSE 'manual'
END
WHERE source_detail IS NULL;

CREATE INDEX IF NOT EXISTS artwork_sales_source_detail_idx
  ON public.artwork_sales (source_detail);

CREATE INDEX IF NOT EXISTS artwork_sales_voided_at_idx
  ON public.artwork_sales (voided_at);

CREATE INDEX IF NOT EXISTS artwork_sales_import_batch_idx
  ON public.artwork_sales (import_batch_id);

COMMENT ON COLUMN public.artwork_sales.import_batch_id
  IS 'CSV 이관 배치 식별자(동일 배치 재실행 멱등성 보장)';
COMMENT ON COLUMN public.artwork_sales.import_row_no
  IS 'CSV 원본 행 번호(배치 내 고유키)';
COMMENT ON COLUMN public.artwork_sales.source_detail
  IS '판매 상세 출처(manual/manual_csv/cafe24_api/legacy_csv)';
COMMENT ON COLUMN public.artwork_sales.voided_at
  IS '취소/환불 등으로 매출 집계에서 제외된 시각';
COMMENT ON COLUMN public.artwork_sales.void_reason
  IS 'void 처리 사유(주문상태/추적정보)';

CREATE TABLE IF NOT EXISTS public.cafe24_sales_sync_failed_orders (
  mall_id text NOT NULL,
  order_id text NOT NULL,
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  last_failed_at timestamptz NOT NULL DEFAULT now(),
  retry_count integer NOT NULL DEFAULT 1 CHECK (retry_count >= 1),
  last_error text,
  resolved_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mall_id, order_id)
);

ALTER TABLE public.cafe24_sales_sync_failed_orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cafe24_sales_sync_failed_orders TO service_role;

CREATE INDEX IF NOT EXISTS cafe24_sales_sync_failed_orders_unresolved_idx
  ON public.cafe24_sales_sync_failed_orders (mall_id, last_failed_at DESC)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.cafe24_sales_sync_failed_orders
  IS 'Cafe24 주문 동기화 실패 재시도 큐';
