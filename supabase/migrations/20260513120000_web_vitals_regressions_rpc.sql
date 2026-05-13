-- =============================================
-- Web Vitals 회귀 감지 RPC
-- =============================================
--
-- 배경: WebVitalsPanel은 metric별 전체 p75와 LCP worst pages를 보여주지만,
-- "지금 회귀가 발생한 페이지" 한 눈에 식별이 어렵다. 운영자는 매일 admin을
-- 열 때 회귀를 자동 인지해야 함.
--
-- 이 RPC는 최근 N일 윈도우에서 metric × page_path별 p75를 산출하고
-- Google Core Web Vitals 공식 "poor" 임계를 초과한 페이지만 반환.
-- admin nav의 "분석" 그룹 옆 alert dot + WebVitalsPanel 회귀 섹션에서 사용.
--
-- 임계 (Google CWV 공식):
--   LCP poor: > 4000ms
--   INP poor: > 500ms
--   CLS poor: > 0.25
--   FCP poor: > 3000ms
--   TTFB poor: > 1800ms
--
-- sample_size 최소값 강제: 트래픽 적은 페이지의 극단값으로 false alert 차단.
-- 기본 10건 미만 페이지 제외.

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
    -- LCP·INP·CLS 우선 (Core Web Vitals), 그 다음 FCP·TTFB
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

-- 회귀 카운트만 빠르게 (admin nav dot 표시용 — 매 admin 페이지 로드 시 호출되므로 가벼움)
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
