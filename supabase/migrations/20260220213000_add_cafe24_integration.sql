-- Cafe24 integration: token persistence + artwork sync metadata

CREATE TABLE IF NOT EXISTS public.cafe24_tokens (
  mall_id text PRIMARY KEY,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text,
  scope text,
  expires_in integer,
  expires_at timestamptz NOT NULL,
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cafe24_tokens ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, but explicit grants keep behavior predictable.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cafe24_tokens TO service_role;

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS cafe24_product_no bigint,
  ADD COLUMN IF NOT EXISTS cafe24_custom_product_code text,
  ADD COLUMN IF NOT EXISTS cafe24_sync_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cafe24_sync_error text,
  ADD COLUMN IF NOT EXISTS cafe24_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS artworks_cafe24_product_no_idx
  ON public.artworks (cafe24_product_no);

CREATE INDEX IF NOT EXISTS artworks_cafe24_custom_product_code_idx
  ON public.artworks (cafe24_custom_product_code);

CREATE INDEX IF NOT EXISTS artworks_cafe24_sync_status_idx
  ON public.artworks (cafe24_sync_status);
