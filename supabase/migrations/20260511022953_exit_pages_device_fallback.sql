-- get_pv_top_exit_pages — session_id NULL 시 device_id fallback
-- 배경: 직전 fix(session_id sentinel '0'→NULL)로 모든 row의 session_id가 NULL이 되어 기존
-- WHERE session_id IS NOT NULL 필터가 모든 row를 제외 → exit_pages 0 결과 회귀.
-- get_pv_session_depth(20260511003103)와 동일하게 COALESCE(session_id, device_id) fallback.

CREATE OR REPLACE FUNCTION get_pv_top_exit_pages(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(path text, exit_count bigint, total_views bigint, exit_rate numeric)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH last_in_session AS (
    SELECT DISTINCT ON (sess)
      COALESCE(session_id, device_id) AS sess,
      path
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
      AND COALESCE(session_id, device_id) IS NOT NULL
    ORDER BY sess, event_timestamp DESC
  ),
  exit_counts AS (
    SELECT path, COUNT(*) AS exit_count
    FROM last_in_session
    GROUP BY path
  ),
  view_counts AS (
    SELECT path, COUNT(*) AS total_views
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
    GROUP BY path
  )
  SELECT
    e.path,
    e.exit_count,
    v.total_views,
    ROUND((e.exit_count::numeric / NULLIF(v.total_views, 0)) * 100, 1) AS exit_rate
  FROM exit_counts e
  JOIN view_counts v USING (path)
  WHERE v.total_views >= 5
  ORDER BY e.exit_count DESC
  LIMIT lim
$$;
