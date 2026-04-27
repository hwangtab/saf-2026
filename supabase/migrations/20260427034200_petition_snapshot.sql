-- ============================================================
-- Migration: 청원 마감 스냅샷
-- PRD §10.7.11. 마감 시각에 카운터 동결값을 저장해
-- 페이지에는 더 이상 갱신되지 않는 최종값을 노출한다.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.petition_snapshot (
  petition_slug    text PRIMARY KEY REFERENCES public.petitions(slug),
  total            integer NOT NULL,
  committee_total  integer NOT NULL,
  region_top_count integer NOT NULL,
  region_breakdown jsonb   NOT NULL DEFAULT '[]'::jsonb,    -- [{region_top, count}, ...]
  taken_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.petition_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Snapshot public read" ON public.petition_snapshot;
CREATE POLICY "Snapshot public read" ON public.petition_snapshot
  FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.petition_snapshot FROM anon, authenticated;
GRANT SELECT ON public.petition_snapshot TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.petition_snapshot TO service_role;

-- ────────────────────────────────────────────────────────────
-- close_petition: 마감 처리 함수
--   - petitions.is_active = false
--   - petitions.closed_at = now()
--   - petition_snapshot에 동결값 저장 (지역별 분포 포함)
--   - 감사 로그 기록
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.close_petition(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role           text;
  v_total          integer;
  v_committee      integer;
  v_region_count   integer;
  v_breakdown      jsonb;
BEGIN
  -- pg_cron은 JWT claim이 NULL인 상태로 호출 → NULL이면 통과,
  -- anon/authenticated 호출은 차단. service_role은 항상 통과.
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS NOT NULL AND v_role <> 'service_role' THEN
    RAISE EXCEPTION 'PETITION_CLOSE_FORBIDDEN';
  END IF;

  SELECT total, committee_total, region_top_count
    INTO v_total, v_committee, v_region_count
  FROM public.petition_counts
  WHERE petition_slug = p_slug;

  IF v_total IS NULL THEN
    RAISE EXCEPTION 'PETITION_NOT_FOUND';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'region_top', region_top,
            'count', cnt
         ) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_breakdown
  FROM (
    SELECT region_top, COUNT(*)::integer AS cnt
    FROM public.petition_signatures
    WHERE petition_slug = p_slug AND is_masked = false
    GROUP BY region_top
  ) r;

  INSERT INTO public.petition_snapshot (
    petition_slug, total, committee_total, region_top_count, region_breakdown
  ) VALUES (
    p_slug, v_total, v_committee, v_region_count, v_breakdown
  )
  ON CONFLICT (petition_slug) DO UPDATE SET
    total            = EXCLUDED.total,
    committee_total  = EXCLUDED.committee_total,
    region_top_count = EXCLUDED.region_top_count,
    region_breakdown = EXCLUDED.region_breakdown,
    taken_at         = now();

  UPDATE public.petitions
  SET is_active = false,
      closed_at = COALESCE(closed_at, now())
  WHERE slug = p_slug;

  INSERT INTO public.petition_audit_log (
    petition_slug, action, target_type, details
  ) VALUES (
    p_slug,
    'force_close_campaign',
    'campaign',
    jsonb_build_object(
      'total', v_total,
      'committee_total', v_committee,
      'region_top_count', v_region_count
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'total', v_total,
    'committee_total', v_committee,
    'region_top_count', v_region_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.close_petition(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.close_petition(text) TO service_role;

-- ────────────────────────────────────────────────────────────
-- purge_petition_pii: 보유 기간 초과 후 PII 마스킹
--   - 청원 종료 후 N일 경과 시 호출 (기본 180일)
--   - 성함·이메일·메시지 NULL 처리, 통계용 region_top·is_committee·created_at만 보존
--   - 감사 로그 기록
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_petition_pii(
  p_slug   text,
  p_days   integer DEFAULT 180
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role        text;
  v_closed_at   timestamptz;
  v_purge_count integer;
BEGIN
  -- pg_cron 호환: JWT claim NULL이면 통과(cron), anon/authenticated 차단.
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS NOT NULL AND v_role <> 'service_role' THEN
    RAISE EXCEPTION 'PETITION_PURGE_FORBIDDEN';
  END IF;

  SELECT closed_at INTO v_closed_at FROM public.petitions WHERE slug = p_slug;
  IF v_closed_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PETITION_NOT_CLOSED');
  END IF;

  IF now() < v_closed_at + make_interval(days => p_days) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'RETENTION_NOT_EXPIRED');
  END IF;

  WITH purged AS (
    UPDATE public.petition_signatures
    SET full_name  = '(파기됨)',
        email      = '(파기됨)',
        email_hash = '(파기됨)',
        message    = NULL,
        ip_hash    = NULL,
        user_agent = NULL
    WHERE petition_slug = p_slug
      AND full_name <> '(파기됨)'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_purge_count FROM purged;

  INSERT INTO public.petition_audit_log (
    petition_slug, action, target_type, details
  ) VALUES (
    p_slug,
    'manual_purge_pii',
    'batch',
    jsonb_build_object('purged_count', v_purge_count, 'retention_days', p_days)
  );

  RETURN jsonb_build_object('ok', true, 'purged', v_purge_count);
END;
$$;

REVOKE ALL ON FUNCTION public.purge_petition_pii(text, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.purge_petition_pii(text, integer) TO service_role;
