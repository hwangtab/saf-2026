-- =============================================
-- Web Vitals 자체 분석용 RPC
-- =============================================
--
-- 배경: WebVitalsTracker가 GA4와 동시에 Vercel Analytics track('web_vitals', {...})로
-- 자체 page_views 테이블에 적재(event_type='event', event_name='web_vitals'). GA4 Custom
-- Dimension 등록 없이도 admin 분석 패널에서 metric별 분포·p75·rating breakdown을 직접
-- 산출. raw 데이터를 보유하므로 임의 집계(percentile, histogram)가 GA4보다 자유.
--
-- event_data jsonb 컬럼에 다음 키 저장(WebVitalsTracker 송신과 1:1 일치):
--   - metric_name: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB'
--   - metric_value: number (CLS는 0~1, 나머지는 ms)
--   - metric_rating: 'good' | 'needs-improvement' | 'poor'
--   - page_path: string
--   - debug_target: string | null (LCP element selector, CLS shift target 등)
--
-- 인덱스: 20260508110000 마이그레이션의 idx_pv_event_name + idx_pv_event_data_gin 재사용.

-- 1) 요약 — metric별 이벤트 수·평균·p75·rating 분포
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
    -- percentile_cont는 ordered-set aggregate. WITHIN GROUP 필수.
    -- jsonb 값은 text라 numeric 캐스팅 필요. NULL/비정상 값은 percentile에서 자동 무시.
    percentile_cont(0.75) WITHIN GROUP (ORDER BY (event_data->>'metric_value')::numeric) AS p75_value,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY (event_data->>'metric_value')::numeric) AS median_value,
    avg((event_data->>'metric_value')::numeric) AS avg_value
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'web_vitals'
    AND event_data ? 'metric_name'
    AND event_data ? 'metric_value'
  GROUP BY 1
  ORDER BY 1
$$;

-- 2) 일자별 metric × p75 추이 (성능 회귀 추적)
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
    -- good rate: 0~1 비율 (UI에서 % 변환). poor·needs-improvement 비율은 계산식으로 파생 가능.
    (COUNT(*) FILTER (WHERE event_data->>'metric_rating' = 'good'))::numeric
      / NULLIF(COUNT(*), 0) AS good_rate
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'web_vitals'
    AND event_data ? 'metric_name'
    AND event_data ? 'metric_value'
  GROUP BY 1, 2
  ORDER BY 1, 2
$$;

-- 3) 어떤 페이지가 가장 느린지 — p75 기준 페이지별 TOP N (CRO/성능 진단)
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
  GROUP BY 1
  HAVING COUNT(*) >= 3 -- noise floor: 3샘플 미만 페이지는 p75 불안정
  ORDER BY p75_value DESC
  LIMIT lim
$$;

-- =============================================
-- 권한
-- =============================================

REVOKE EXECUTE ON FUNCTION get_web_vitals_summary(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_web_vitals_daily_p75(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_web_vitals_worst_pages(timestamptz, text, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_web_vitals_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_web_vitals_daily_p75(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_web_vitals_worst_pages(timestamptz, text, int) TO service_role;
