-- =============================================
-- Page views 분석 강화 — 빠른 win 4종
-- =============================================
--
-- 경영자 대시보드용 인사이트 4가지:
--   1) 세션 깊이: 한 사용자가 몇 페이지를 보는지 (engagement 척도)
--   2) 이탈 페이지: 어디서 사이트를 떠나는지 (CRO 직격)
--   3) 첫 방문자 vs 재방문자: 재방문 유도 효과 측정
--   4) UTM 분포: 캠페인·매체별 traffic 분리 (마케팅 ROI)
--
-- 모든 RPC는 SECURITY DEFINER + service_role only — admin client에서만 호출.
-- 참고: page_views 테이블은 vercel-drain webhook으로 채워짐. 새 컬럼 query_params 추가는
-- 별도 webhook 패치로 보존(같은 commit에 포함).

-- query_params: Vercel Drain v2 schema의 queryParams 필드 (URL query string raw)
-- 예: 'utm_source=naver&utm_medium=cpc&utm_campaign=spring2026'
-- jsonb 대신 text로 저장: 파싱은 RPC에서 split_part 또는 regexp.
ALTER TABLE page_views
  ADD COLUMN IF NOT EXISTS query_params text;

-- 1) 세션 깊이 — total_sessions, total_pageviews, avg/median pages per session
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
    SELECT session_id, COUNT(*) AS pages
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
      AND session_id IS NOT NULL
    GROUP BY session_id
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

-- 2) 이탈 페이지 — 세션마다 마지막 페이지 + 이탈률
-- exit_rate = 그 페이지에서 이탈한 횟수 / 그 페이지 총 페이지뷰
CREATE OR REPLACE FUNCTION get_pv_top_exit_pages(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(
  path text,
  exit_count bigint,
  total_views bigint,
  exit_rate numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH last_in_session AS (
    SELECT DISTINCT ON (session_id)
      session_id, path
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
      AND session_id IS NOT NULL
    ORDER BY session_id, event_timestamp DESC
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
  WHERE v.total_views >= 5  -- 노이즈 제거: 5회 미만 노출 페이지는 제외
  ORDER BY e.exit_count DESC
  LIMIT lim
$$;

-- 3) 첫 방문자 vs 재방문자 — device_id의 first_seen이 since_ts 이후면 신규
-- 즉 since_ts 이전에도 본 적 있으면 returning, 아니면 new
CREATE OR REPLACE FUNCTION get_pv_visitor_recurrence(since_ts timestamptz)
RETURNS TABLE(
  new_visitors bigint,
  returning_visitors bigint,
  new_visitor_pageviews bigint,
  returning_visitor_pageviews bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH device_first_seen AS (
    SELECT device_id, MIN(event_timestamp) AS first_seen
    FROM page_views
    WHERE device_id IS NOT NULL
      AND event_type = 'pageview'
    GROUP BY device_id
  ),
  classified AS (
    SELECT
      pv.device_id,
      CASE
        WHEN dfs.first_seen >= since_ts THEN 'new'
        ELSE 'returning'
      END AS visitor_type
    FROM page_views pv
    JOIN device_first_seen dfs USING (device_id)
    WHERE pv.event_timestamp >= since_ts
      AND pv.event_type = 'pageview'
  )
  SELECT
    COUNT(DISTINCT device_id) FILTER (WHERE visitor_type = 'new') AS new_visitors,
    COUNT(DISTINCT device_id) FILTER (WHERE visitor_type = 'returning') AS returning_visitors,
    COUNT(*) FILTER (WHERE visitor_type = 'new') AS new_visitor_pageviews,
    COUNT(*) FILTER (WHERE visitor_type = 'returning') AS returning_visitor_pageviews
  FROM classified
$$;

-- 4) UTM 분포 — query_params에서 utm_source/medium/campaign 파싱
-- helper 함수: query string에서 특정 param 값 추출
CREATE OR REPLACE FUNCTION extract_query_param(qs text, key text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT (
    regexp_match(
      qs,
      '(?:^|&)' || regexp_replace(key, '([^[:alnum:]_])', '\\\1', 'g') || '=([^&]*)'
    )
  )[1]
$$;

CREATE OR REPLACE FUNCTION get_pv_utm_distribution(since_ts timestamptz, lim int DEFAULT 20)
RETURNS TABLE(
  utm_source text,
  utm_medium text,
  utm_campaign text,
  views bigint,
  visitors bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(extract_query_param(query_params, 'utm_source'), '(direct)') AS utm_source,
    COALESCE(extract_query_param(query_params, 'utm_medium'), '(none)') AS utm_medium,
    COALESCE(extract_query_param(query_params, 'utm_campaign'), '(none)') AS utm_campaign,
    COUNT(*) AS views,
    COUNT(DISTINCT device_id) AS visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'pageview'
    AND query_params IS NOT NULL
    AND query_params LIKE '%utm_%'
  GROUP BY 1, 2, 3
  ORDER BY views DESC
  LIMIT lim
$$;

-- =============================================
-- 권한
-- =============================================

REVOKE EXECUTE ON FUNCTION get_pv_session_depth(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_pv_top_exit_pages(timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_pv_visitor_recurrence(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_pv_utm_distribution(timestamptz, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_pv_session_depth(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_pv_top_exit_pages(timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_pv_visitor_recurrence(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_pv_utm_distribution(timestamptz, int) TO service_role;
-- extract_query_param은 RPC 안에서 호출되는 helper라 service_role 권한만 필요
REVOKE EXECUTE ON FUNCTION extract_query_param(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION extract_query_param(text, text) TO service_role;
