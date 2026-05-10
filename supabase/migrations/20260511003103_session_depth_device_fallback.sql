-- =============================================
-- get_pv_session_depth: session_id NULL 시 device_id fallback
-- =============================================
--
-- 배경: Vercel Drain SDK가 4/17부터 sessionId 미설정 상태를 0/'0' sentinel로 보내는
-- 회귀로 22,206 PV의 session_id가 모두 같은 값('0')으로 적재됨. webhook handler에서
-- '0'을 NULL로 정정 + 기존 row backfill 완료.
--
-- 정정 후 session_id가 모두 NULL이라 기존 RPC가 0 세션 반환. 단순화: device_id를
-- session 식별자로 fallback 사용 — 1 device = 1 session 가정으로 의미 있는
-- "device당 평균 PV" 산출. 정확한 30분 inactivity-based 세션 분할은 향후 보강.

CREATE OR REPLACE FUNCTION get_pv_session_depth(since_ts timestamptz)
RETURNS TABLE(
  total_sessions bigint,
  total_pageviews bigint,
  avg_pages_per_session numeric,
  median_pages_per_session numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH per_session AS (
    -- session_id 우선, 없으면 device_id로 fallback. 둘 다 없는 row는 제외.
    SELECT
      COALESCE(session_id, device_id) AS sess,
      COUNT(*) AS pages
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
      AND COALESCE(session_id, device_id) IS NOT NULL
    GROUP BY 1
  )
  SELECT
    COUNT(*) AS total_sessions,
    COALESCE(SUM(pages), 0) AS total_pageviews,
    COALESCE(ROUND(AVG(pages)::numeric, 2), 0) AS avg_pages_per_session,
    COALESCE(
      ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY pages)::numeric, 2),
      0
    ) AS median_pages_per_session
  FROM per_session
$$;
