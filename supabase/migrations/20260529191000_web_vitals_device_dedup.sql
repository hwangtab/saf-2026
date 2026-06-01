-- =============================================
-- Web Vitals 회귀 RPC — device 단위 dedup
-- =============================================
--
-- 배경: 2026-05-27 단일 desktop Chrome 세션(device_id=1310376650)이 56분 동안
-- 같은 CLS 값(0.781832298136646)을 10번 적재 → /stories 회귀 false-positive 발생.
-- 원인: web-vitals의 visibilitychange hidden 트리거 + SPA 재진입 시 누적값이
-- 같은 값으로 반복 전송되는데 RPC가 row 단위로만 sample을 카운트해 min_sample_size=10
-- 임계를 단일 device가 충족.
--
-- 해결: get_web_vitals_regressions를 (page_path, metric_name, device_id) 단위로
-- 먼저 dedup해서 device당 최대값 1개만 통계에 반영. 같은 device가 같은 값을 100번
-- 보내도 1 sample로 카운트.
--
-- 부수 효과: sample_size 의미가 "보고 row 수" → "고유 device 수"로 변경.
-- 임계 min_sample_size=10은 그대로 두면 더 엄격해짐(10명 이상이 poor 경험해야 회귀).
-- 진짜 회귀는 더 신뢰성 높은 신호로 잡힘.
--
-- get_web_vitals_regression_count는 본 함수를 호출하므로 자동 커버.
-- get_web_vitals_worst_cls_targets는 영향 범위 다름 — 별도 처리 안 함.

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
  -- 1단계: (path, metric, device) 단위 dedup. 같은 device가 같은 path에서 같은
  -- metric을 여러 번 보내도 최대값 1개로 통합. device_id가 NULL인 row는 자체적으로
  -- 별도 그룹(NULL = anonymous) — 봇·session 미수립 트래픽이 통계 부풀리기 못 함.
  per_device AS (
    SELECT
      event_data->>'metric_name' AS metric_name,
      COALESCE(event_data->>'page_path', '/') AS page_path,
      device_id,
      MAX((event_data->>'metric_value')::numeric) AS device_value,
      bool_or(event_data->>'metric_rating' = 'poor') AS device_poor
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
    GROUP BY 1, 2, 3
  ),
  -- 2단계: device 단위로 통계 집계. sample_size = 고유 device 수.
  page_metric_stats AS (
    SELECT
      metric_name,
      page_path,
      COUNT(*) AS sample_size,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY device_value) AS p75_value,
      (COUNT(*) FILTER (WHERE device_poor))::numeric / NULLIF(COUNT(*), 0) AS poor_ratio
    FROM per_device
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

-- search_path 고정 (보안 — 2026-05-11 function_search_path 정책 준수)
ALTER FUNCTION public.get_web_vitals_regressions(timestamptz, int)
  SET search_path = public, pg_catalog;
