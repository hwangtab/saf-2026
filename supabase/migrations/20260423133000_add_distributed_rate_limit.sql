-- ============================================================
-- Migration: Distributed rate limit for public order/checkout flows
-- - add public.rate_limit_counters
-- - add public.check_rate_limit RPC (atomic, service_role-only)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  key text PRIMARY KEY,
  window_ms integer NOT NULL CHECK (window_ms > 0),
  count integer NOT NULL CHECK (count >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_updated_at
  ON public.rate_limit_counters (updated_at DESC);

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_counters TO service_role;
REVOKE ALL ON public.rate_limit_counters FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
RETURNS TABLE (
  success boolean,
  remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz;
  v_entry public.rate_limit_counters%ROWTYPE;
  v_elapsed_ms bigint;
  v_next_count integer;
  v_role text;
BEGIN
  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RAISE EXCEPTION 'RATE_LIMIT_INVALID_KEY';
  END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RAISE EXCEPTION 'RATE_LIMIT_INVALID_LIMIT';
  END IF;
  IF p_window_ms IS NULL OR p_window_ms <= 0 THEN
    RAISE EXCEPTION 'RATE_LIMIT_INVALID_WINDOW';
  END IF;

  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'RATE_LIMIT_FORBIDDEN';
  END IF;

  LOOP
    v_now := clock_timestamp();

    SELECT *
    INTO v_entry
    FROM public.rate_limit_counters
    WHERE key = p_key
    FOR UPDATE;

    IF FOUND THEN
      v_elapsed_ms := floor(extract(epoch FROM (v_now - v_entry.window_started_at)) * 1000);

      IF v_entry.window_ms <> p_window_ms OR v_elapsed_ms > p_window_ms THEN
        UPDATE public.rate_limit_counters
        SET
          window_ms = p_window_ms,
          count = 1,
          window_started_at = v_now,
          updated_at = v_now
        WHERE key = p_key;

        RETURN QUERY SELECT true, GREATEST(0, p_limit - 1);
        RETURN;
      END IF;

      IF v_entry.count >= p_limit THEN
        UPDATE public.rate_limit_counters
        SET updated_at = v_now
        WHERE key = p_key;

        RETURN QUERY SELECT false, 0;
        RETURN;
      END IF;

      v_next_count := v_entry.count + 1;

      UPDATE public.rate_limit_counters
      SET
        count = v_next_count,
        updated_at = v_now
      WHERE key = p_key;

      RETURN QUERY SELECT true, GREATEST(0, p_limit - v_next_count);
      RETURN;
    END IF;

    BEGIN
      INSERT INTO public.rate_limit_counters (
        key,
        window_ms,
        count,
        window_started_at,
        updated_at
      )
      VALUES (p_key, p_window_ms, 1, v_now, v_now);

      RETURN QUERY SELECT true, GREATEST(0, p_limit - 1);
      RETURN;
    EXCEPTION
      WHEN unique_violation THEN
        -- 동시 INSERT 충돌 시 재시도
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

COMMENT ON TABLE public.rate_limit_counters IS 'Distributed rate limit counters for public flows';
COMMENT ON FUNCTION public.check_rate_limit IS 'Atomic sliding window rate limiter (service_role only)';
COMMENT ON COLUMN public.orders.order_no IS 'SAF-YYYYMMDD-XXXXXXXX format, unique per order';
