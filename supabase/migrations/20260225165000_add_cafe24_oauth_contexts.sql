CREATE TABLE IF NOT EXISTS public.cafe24_oauth_contexts (
  state text PRIMARY KEY,
  mall_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('cafe24', 'internal')),
  return_to text,
  launch_request_fingerprint text UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cafe24_oauth_contexts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cafe24_oauth_contexts TO service_role;

CREATE INDEX IF NOT EXISTS cafe24_oauth_contexts_expires_idx
  ON public.cafe24_oauth_contexts (expires_at);

CREATE INDEX IF NOT EXISTS cafe24_oauth_contexts_consumed_idx
  ON public.cafe24_oauth_contexts (consumed_at);
