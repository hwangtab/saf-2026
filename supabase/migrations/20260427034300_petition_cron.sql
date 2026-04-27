-- ============================================================
-- Migration: 청원 자동화 cron
-- PRD §10.7.11. 마감 시각 자동 close + 보유 기간 만료 시 PII 자동 파기.
--
-- 전제: pg_cron 익스텐션이 활성화되어 있어야 한다.
--   Supabase Studio > Database > Extensions에서 pg_cron 활성화.
--   CLI: supabase functions나 dashboard로 활성화.
--
-- 본 마이그레이션은 안전성을 위해 pg_cron이 없으면 graceful skip한다.
-- pg_cron 활성화 후 다음 SQL을 한 번 더 적용하면 cron이 등록된다.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 자동 마감 디스패처: 매시간 실행되어 마감 도래한 청원을 close
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.close_petitions_due()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug   text;
  v_count  integer := 0;
  v_result jsonb;
BEGIN
  -- service_role 가드: cron job은 superuser로 실행되므로 별도 검사 불필요.
  -- 하지만 외부 호출 차단 위해 super check.
  IF current_setting('request.jwt.claim.role', true) IS NOT NULL
     AND current_setting('request.jwt.claim.role', true) NOT IN ('service_role') THEN
    RAISE EXCEPTION 'AUTO_CLOSE_FORBIDDEN';
  END IF;

  FOR v_slug IN
    SELECT slug FROM public.petitions
    WHERE is_active = true AND deadline_at <= now()
  LOOP
    v_result := public.close_petition(v_slug);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'closed', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.close_petitions_due() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.close_petitions_due() TO service_role;

-- ────────────────────────────────────────────────────────────
-- 자동 파기 디스패처: 매일 03:00 KST 실행
--   닫힌 모든 청원에 대해 보유기간(180일) 초과 시 PII 마스킹.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_petitions_expired()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug   text;
  v_total  integer := 0;
  v_result jsonb;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS NOT NULL
     AND current_setting('request.jwt.claim.role', true) NOT IN ('service_role') THEN
    RAISE EXCEPTION 'AUTO_PURGE_FORBIDDEN';
  END IF;

  FOR v_slug IN
    SELECT slug FROM public.petitions
    WHERE closed_at IS NOT NULL
      AND closed_at + interval '180 days' <= now()
  LOOP
    v_result := public.purge_petition_pii(v_slug, 180);
    IF (v_result->>'ok')::boolean THEN
      v_total := v_total + COALESCE((v_result->>'purged')::integer, 0);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'total_purged', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.purge_petitions_expired() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.purge_petitions_expired() TO service_role;

-- ────────────────────────────────────────────────────────────
-- pg_cron 등록 (안전 가드)
--   pg_cron이 없으면 NOTICE만 띄우고 종료.
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron not installed — skipping cron registration. '
                 'Enable pg_cron in Supabase Studio > Database > Extensions, '
                 'then re-apply this migration or run cron.schedule() manually.';
    RETURN;
  END IF;

  -- 기존 동명 job 제거 후 재등록 (idempotent)
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('petition_auto_close', 'petition_auto_purge');

  -- 매시간 0분에 마감 검사
  PERFORM cron.schedule(
    'petition_auto_close',
    '0 * * * *',
    $job$ SELECT public.close_petitions_due(); $job$
  );

  -- 매일 03:00 KST = 18:00 UTC (전날) 에 보유기간 만료 파기 검사
  PERFORM cron.schedule(
    'petition_auto_purge',
    '0 18 * * *',
    $job$ SELECT public.purge_petitions_expired(); $job$
  );

  RAISE NOTICE 'Cron jobs registered: petition_auto_close (hourly), petition_auto_purge (daily 03:00 KST)';
END;
$$;
