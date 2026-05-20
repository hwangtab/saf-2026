-- =============================================
-- Web Vitals CLS artifact 필터 — no-session 정수 1.0 제외
-- =============================================
--
-- 배경: WebVitalsTracker에서 수집된 mobile CLS 이벤트 중 일부가
-- metric_value = 정확한 정수 1 + session_id IS NULL 조합으로
-- 적재됨. 이는 봇·링크프리뷰 크롤러 또는 쿠키 차단 in-app webview에서
-- Vercel Analytics drain을 통해 들어오는 측정 artifact.
--
-- fingerprint 확정 근거 (2026-05-20):
--   - 진짜 web-vitals 값은 0.87296142578125 등 긴 소수; 정수 1.0은 나오지 않음
--   - session_id 전부 NULL (실사용자 = 쿠키 있음 = session 있음)
--   - per-path fix 배포 전후로 붙는 경로만 변경 (페이지 결함 아님)
--   - genuine float(session 있음) mobile CLS p75 = 0.000 (양호)
--
-- 이 migration은 5개 web_vitals 집계 RPC에 동일한 제외 predicate를 추가.
-- 제외 predicate: CLS이고 metric_value = 1 이고 session_id IS NULL 인 행
-- LCP·INP·FCP·TTFB는 무영향. CLS가 정수 1.0이 되는 정상 케이스는 사실상 없으므로
-- genuine 데이터 손실 없음.
--
-- 변경 범위: WHERE 절 1행 추가 per function. 시그니처·GRANT·정렬 유지.

-- =============================================
-- 1) get_web_vitals_summary
-- =============================================
CREATE OR REPLACE FUNCTION get_web_vitals_summary(since_ts timestamptz)
RETURNS TABLE(
  metric_name text,
  total_events bigint,
  good_count bigint,
  needs_improvement_count bigint,
  poor_count bigint,
  p75_value numeric,
  median_value numeric,
  avg_value numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    event_data->>'metric_name' AS metric_name,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE event_data->>'metric_rating' = 'good') AS good_count,
    COUNT(*) FILTER (WHERE event_data->>'metric_rating' = 'needs-improvement') AS needs_improvement_count,
    COUNT(*) FILTER (WHERE event_data->>'metric_rating' = 'poor') AS poor_count,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY (event_data->>'metric_value')::numeric) AS p75_value,
    percentile_cont(0.5)  WITHIN GROUP (ORDER BY (event_data->>'metric_value')::numeric) AS median_value,
    avg((event_data->>'metric_value')::numeric) AS avg_value
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'web_vitals'
    AND event_data ? 'metric_name'
    AND event_data ? 'metric_value'
    AND NOT (
      event_data->>'metric_name' = 'CLS'
      AND (event_data->>'metric_value')::numeric = 1
      AND session_id IS NULL
    )
  GROUP BY 1
  ORDER BY 1
$$;

-- =============================================
-- 2) get_web_vitals_daily_p75
-- =============================================
CREATE OR REPLACE FUNCTION get_web_vitals_daily_p75(since_ts timestamptz)
RETURNS TABLE(
  day date,
  metric_name text,
  sample_size bigint,
  p75_value numeric,
  good_rate numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    date_trunc('day', event_timestamp)::date AS day,
    event_data->>'metric_name' AS metric_name,
    COUNT(*) AS sample_size,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY (event_data->>'metric_value')::numeric) AS p75_value,
    (COUNT(*) FILTER (WHERE event_data->>'metric_rating' = 'good'))::numeric
      / NULLIF(COUNT(*), 0) AS good_rate
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'web_vitals'
    AND event_data ? 'metric_name'
    AND event_data ? 'metric_value'
    AND NOT (
      event_data->>'metric_name' = 'CLS'
      AND (event_data->>'metric_value')::numeric = 1
      AND session_id IS NULL
    )
  GROUP BY 1, 2
  ORDER BY 1, 2
$$;

-- =============================================
-- 3) get_web_vitals_worst_pages
-- =============================================
CREATE OR REPLACE FUNCTION get_web_vitals_worst_pages(
  since_ts timestamptz,
  target_metric text,
  lim int DEFAULT 10
)
RETURNS TABLE(
  page_path text,
  sample_size bigint,
  p75_value numeric,
  poor_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(event_data->>'page_path', '/') AS page_path,
    COUNT(*) AS sample_size,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY (event_data->>'metric_value')::numeric) AS p75_value,
    COUNT(*) FILTER (WHERE event_data->>'metric_rating' = 'poor') AS poor_count
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'web_vitals'
    AND event_data->>'metric_name' = target_metric
    AND event_data ? 'metric_value'
    AND NOT (
      event_data->>'metric_name' = 'CLS'
      AND (event_data->>'metric_value')::numeric = 1
      AND session_id IS NULL
    )
  GROUP BY 1
  HAVING COUNT(*) >= 3
  ORDER BY p75_value DESC
  LIMIT lim
$$;

-- =============================================
-- 4) get_web_vitals_regressions
-- =============================================
CREATE OR REPLACE FUNCTION get_web_vitals_regressions(
  since_ts timestamptz,
  min_sample_size int DEFAULT 10
)
RETURNS TABLE(
  metric_name text,
  page_path text,
  sample_size bigint,
  p75_value numeric,
  poor_threshold numeric,
  poor_ratio numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH metric_thresholds(metric_name, poor_threshold) AS (
    VALUES
      ('LCP', 4000::numeric),
      ('INP', 500::numeric),
      ('CLS', 0.25::numeric),
      ('FCP', 3000::numeric),
      ('TTFB', 1800::numeric)
  ),
  page_metric_stats AS (
    SELECT
      event_data->>'metric_name' AS metric_name,
      COALESCE(event_data->>'page_path', '/') AS page_path,
      COUNT(*) AS sample_size,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY (event_data->>'metric_value')::numeric) AS p75_value,
      (COUNT(*) FILTER (WHERE event_data->>'metric_rating' = 'poor'))::numeric
        / NULLIF(COUNT(*), 0) AS poor_ratio
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'event'
      AND event_name = 'web_vitals'
      AND event_data ? 'metric_name'
      AND event_data ? 'metric_value'
      AND NOT (
        event_data->>'metric_name' = 'CLS'
        AND (event_data->>'metric_value')::numeric = 1
        AND session_id IS NULL
      )
    GROUP BY 1, 2
  )
  SELECT
    s.metric_name,
    s.page_path,
    s.sample_size,
    s.p75_value,
    t.poor_threshold,
    s.poor_ratio
  FROM page_metric_stats s
  JOIN metric_thresholds t USING (metric_name)
  WHERE s.sample_size >= min_sample_size
    AND s.p75_value > t.poor_threshold
  ORDER BY
    CASE s.metric_name
      WHEN 'LCP' THEN 1
      WHEN 'INP' THEN 2
      WHEN 'CLS' THEN 3
      WHEN 'FCP' THEN 4
      WHEN 'TTFB' THEN 5
      ELSE 6
    END,
    s.poor_ratio DESC NULLS LAST,
    s.p75_value DESC
$$;

GRANT EXECUTE ON FUNCTION get_web_vitals_regressions(timestamptz, int) TO authenticated;

-- get_web_vitals_regression_count는 get_web_vitals_regressions를 호출하므로 자동 커버
CREATE OR REPLACE FUNCTION get_web_vitals_regression_count(
  since_ts timestamptz,
  min_sample_size int DEFAULT 10
)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::int
  FROM get_web_vitals_regressions(since_ts, min_sample_size)
$$;

GRANT EXECUTE ON FUNCTION get_web_vitals_regression_count(timestamptz, int) TO authenticated;

-- =============================================
-- 5) get_web_vitals_worst_cls_targets
-- =============================================
CREATE OR REPLACE FUNCTION public.get_web_vitals_worst_cls_targets(
  days_back integer DEFAULT 7,
  min_samples integer DEFAULT 3,
  lim integer DEFAULT 20
)
RETURNS TABLE (
  page_path text,
  shift_target text,
  samples bigint,
  p75 numeric,
  poor_rate numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(event_data->>'page_path', '(unknown)') AS page_path,
    COALESCE(NULLIF(event_data->>'debug_target', ''), '(none)') AS shift_target,
    COUNT(*) AS samples,
    percentile_cont(0.75) WITHIN GROUP (
      ORDER BY (event_data->>'metric_value')::numeric
    ) AS p75,
    AVG(CASE WHEN event_data->>'metric_rating' = 'poor' THEN 1 ELSE 0 END)::numeric AS poor_rate
  FROM public.page_views
  WHERE event_name = 'web_vitals'
    AND event_data->>'metric_name' = 'CLS'
    AND created_at > now() - (days_back || ' days')::interval
    AND NOT (
      (event_data->>'metric_value')::numeric = 1
      AND session_id IS NULL
    )
  GROUP BY 1, 2
  HAVING COUNT(*) >= min_samples
  ORDER BY p75 DESC, samples DESC
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION public.get_web_vitals_worst_cls_targets(integer, integer, integer) TO authenticated;
