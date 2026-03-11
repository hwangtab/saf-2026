-- =============================================
-- 추가 분석용 RPC 함수
-- =============================================

-- 1) 국가별 방문 분포
CREATE OR REPLACE FUNCTION get_pv_country_distribution(since_ts timestamptz, lim int DEFAULT 20)
RETURNS TABLE(country text, views bigint, visitors bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(country, 'unknown') AS country,
    COUNT(*) AS views,
    COUNT(DISTINCT device_id) AS visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
  GROUP BY 1
  ORDER BY views DESC
  LIMIT lim
$$;

-- 2) 브라우저 분포
CREATE OR REPLACE FUNCTION get_pv_browser_distribution(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(browser text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(client_name, 'unknown') AS browser,
    COUNT(*) AS count
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
  GROUP BY 1
  ORDER BY count DESC
  LIMIT lim
$$;

-- 3) OS 분포
CREATE OR REPLACE FUNCTION get_pv_os_distribution(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(os text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(os_name, 'unknown') AS os,
    COUNT(*) AS count
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
  GROUP BY 1
  ORDER BY count DESC
  LIMIT lim
$$;

-- 4) 시간대별 방문 분포 (0~23시)
CREATE OR REPLACE FUNCTION get_pv_hourly_distribution(since_ts timestamptz)
RETURNS TABLE(hour int, views bigint, visitors bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    EXTRACT(HOUR FROM event_timestamp AT TIME ZONE 'Asia/Seoul')::int AS hour,
    COUNT(*) AS views,
    COUNT(DISTINCT device_id) AS visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
  GROUP BY 1
  ORDER BY 1
$$;

-- 5) 실시간 방문자 수 (최근 N분)
CREATE OR REPLACE FUNCTION get_pv_realtime_visitors(minutes int DEFAULT 5)
RETURNS TABLE(active_visitors bigint, active_pageviews bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(DISTINCT device_id) AS active_visitors,
    COUNT(*) AS active_pageviews
  FROM page_views
  WHERE event_timestamp >= (now() - (minutes || ' minutes')::interval)
    AND event_type = 'pageview'
$$;
