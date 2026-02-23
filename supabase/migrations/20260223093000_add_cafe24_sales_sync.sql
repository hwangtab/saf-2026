-- Cafe24 order -> artwork_sales automatic sync metadata/state
-- Goal:
-- 1) Keep existing manual sales untouched
-- 2) Append only newly synced Cafe24 sales

ALTER TABLE public.artwork_sales
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_order_id text,
  ADD COLUMN IF NOT EXISTS external_order_item_code text,
  ADD COLUMN IF NOT EXISTS external_payload jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'artwork_sales_source_check'
      AND conrelid = 'public.artwork_sales'::regclass
  ) THEN
    ALTER TABLE public.artwork_sales
      ADD CONSTRAINT artwork_sales_source_check
      CHECK (source IN ('manual', 'cafe24'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS artwork_sales_source_idx
  ON public.artwork_sales (source);

CREATE INDEX IF NOT EXISTS artwork_sales_external_order_id_idx
  ON public.artwork_sales (external_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS artwork_sales_cafe24_item_code_uidx
  ON public.artwork_sales (external_order_item_code)
  WHERE source = 'cafe24' AND external_order_item_code IS NOT NULL;

COMMENT ON COLUMN public.artwork_sales.source
  IS '판매기록 생성 소스 (manual | cafe24)';
COMMENT ON COLUMN public.artwork_sales.external_order_id
  IS '외부 주문 ID (Cafe24 order_id)';
COMMENT ON COLUMN public.artwork_sales.external_order_item_code
  IS '외부 주문상품 고유 코드 (중복 동기화 방지용)';
COMMENT ON COLUMN public.artwork_sales.external_payload
  IS '외부 주문상품 원본 핵심 데이터 스냅샷';

CREATE TABLE IF NOT EXISTS public.cafe24_sales_sync_state (
  mall_id text PRIMARY KEY,
  cutoff_paid_at timestamptz NOT NULL DEFAULT now(),
  last_synced_paid_at timestamptz,
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cafe24_sales_sync_state ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cafe24_sales_sync_state TO service_role;
