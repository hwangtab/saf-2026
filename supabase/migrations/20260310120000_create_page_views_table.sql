-- =============================================
-- Vercel Analytics Drain: page_views 테이블
-- =============================================

CREATE TABLE page_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL DEFAULT 'pageview',
  path text NOT NULL,
  referrer text,
  country text,
  region text,
  city text,
  os_name text,
  client_name text,
  device_type text,
  session_id text,
  device_id text,
  event_name text,
  event_timestamp timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 집계 쿼리 성능을 위한 인덱스
CREATE INDEX idx_pv_timestamp ON page_views (event_timestamp DESC);
CREATE INDEX idx_pv_path_ts ON page_views (path, event_timestamp DESC);
CREATE INDEX idx_pv_device_type ON page_views (device_type) WHERE device_type IS NOT NULL;
CREATE INDEX idx_pv_device_id_ts ON page_views (device_id, event_timestamp DESC) WHERE device_id IS NOT NULL;

-- RLS: service_role만 쓰기, admin만 읽기
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read page_views"
  ON page_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT ALL ON page_views TO service_role;
GRANT USAGE, SELECT ON SEQUENCE page_views_id_seq TO service_role;

-- =============================================
-- 집계용 RPC 함수
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
  GROUP BY referrer
  ORDER BY count DESC
  LIMIT lim
$$;
