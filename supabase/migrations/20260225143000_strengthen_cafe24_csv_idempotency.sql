ALTER TABLE public.artwork_sales
  ADD COLUMN IF NOT EXISTS import_payload_hash text;

ALTER TABLE public.cafe24_sales_sync_state
  ADD COLUMN IF NOT EXISTS last_synced_void_at timestamptz;

CREATE INDEX IF NOT EXISTS artwork_sales_import_batch_hash_idx
  ON public.artwork_sales (import_batch_id, import_payload_hash);

COMMENT ON COLUMN public.artwork_sales.import_payload_hash
  IS 'CSV 원본 파일 hash(동일 import_batch 재실행 멱등성 검증)';

COMMENT ON COLUMN public.cafe24_sales_sync_state.last_synced_void_at
  IS '취소/환불 역동기화 커서 시각';

UPDATE public.artwork_sales
SET import_row_no = NULLIF(substring(note FROM 'CSV 이관 #([0-9]+)'), '')::integer
WHERE import_row_no IS NULL
  AND note ~ 'CSV 이관 #[0-9]+'
  AND (
    source_detail = 'legacy_csv'
    OR (source = 'cafe24' AND external_order_item_code IS NULL)
  );
