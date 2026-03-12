-- =============================================
-- RPC 함수에서 포털 경로(/admin, /dashboard, /exhibitor) 제외
-- 관리자·아티스트·출품자 내부 활동이 공개 사이트 통계를 왜곡하지 않도록 함
-- =============================================

-- 1) 일별 페이지뷰 + 순 방문자 추이
CREATE OR REPLACE FUNCTION get_pv_daily_trend(since_ts timestamptz)
RETURNS TABLE(day date, views bigint, visitors bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    date_trunc('day', event_timestamp)::date AS day,
    COUNT(*) AS views,
    COUNT(DISTINCT device_id) AS visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
  GROUP BY 1
  ORDER BY 1
$$;

-- 2) 상위 페이지 (경로별 뷰 수)
CREATE OR REPLACE FUNCTION get_pv_top_pages(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(path text, views bigint, visitors bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    path,
    COUNT(*) AS views,
    COUNT(DISTINCT device_id) AS visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
  GROUP BY path
  ORDER BY views DESC
  LIMIT lim
$$;

-- 3) 요약 통계
CREATE OR REPLACE FUNCTION get_pv_summary(since_ts timestamptz)
RETURNS TABLE(total_views bigint, unique_visitors bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) AS total_views,
    COUNT(DISTINCT device_id) AS unique_visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
$$;

-- 4) 디바이스 타입 분포
CREATE OR REPLACE FUNCTION get_pv_device_distribution(since_ts timestamptz)
RETURNS TABLE(device_type text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(device_type, 'unknown') AS device_type,
    COUNT(*) AS count
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
  GROUP BY 1
  ORDER BY count DESC
$$;

-- 5) 상위 추천 소스
CREATE OR REPLACE FUNCTION get_pv_top_referrers(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(referrer text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    referrer,
    COUNT(*) AS count
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
    AND referrer IS NOT NULL
    AND referrer <> ''
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
  GROUP BY referrer
  ORDER BY count DESC
  LIMIT lim
$$;

-- 6) 국가별 방문 분포
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
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
  GROUP BY 1
  ORDER BY views DESC
  LIMIT lim
$$;

-- 7) 브라우저 분포
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
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
  GROUP BY 1
  ORDER BY count DESC
  LIMIT lim
$$;

-- 8) OS 분포
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
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
  GROUP BY 1
  ORDER BY count DESC
  LIMIT lim
$$;

-- 9) 시간대별 방문 분포 (0~23시, KST)
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
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
  GROUP BY 1
  ORDER BY 1
$$;

-- 10) 실시간 방문자 수 (최근 N분)
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
    AND path NOT LIKE '/admin/%'
    AND path NOT LIKE '/dashboard/%'
    AND path NOT LIKE '/exhibitor/%'
$$;
