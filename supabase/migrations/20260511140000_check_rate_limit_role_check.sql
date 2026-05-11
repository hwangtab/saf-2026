-- check_rate_limit RPC role check 회귀 fix.
--
-- 기존: current_setting('request.jwt.claim.role', true)로 caller role 확인.
-- 최신 PostgREST는 이 단수 GUC를 더 이상 채우지 않아 항상 NULL → 항상
-- RATE_LIMIT_FORBIDDEN을 throw → lib/rate-limit.ts가 in-memory fallback으로 떨어짐.
-- 결과: 분산 rate limit이 사실상 미작동 (Vercel 인스턴스마다 별도 카운팅).
--
-- 수정 방향: GRANT/REVOKE로 이미 anon/authenticated EXECUTE 차단(20260423 마이그레이션)
-- 되어 있고 lib/rate-limit.ts는 createSupabaseAdminClient()(service_role 키)로만 호출.
-- 함수 내부 role check는 redundant이지만 보호 차원에서 auth.role() 표준 함수로 교체.
-- auth.role()은 PostgREST 버전과 무관하게 service_role / authenticated / anon 중 하나 반환.

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

  -- auth.role() = service_role 만 허용. anon/authenticated는 GRANT 단에서도 차단됨.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
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
