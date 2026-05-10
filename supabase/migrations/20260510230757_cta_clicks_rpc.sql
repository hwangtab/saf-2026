-- =============================================
-- CTA 클릭(donate / share) 자체 분석용 RPC
-- =============================================
--
-- 트래킹 추가:
-- - donate_click: CTAButtonGroup·Footer·FullscreenMenu의 외부 conversion CTA 클릭
--   event_data: { position, target: 'donate' | 'join_member' | 'other', page_path }
--
-- - share_click: ShareButtons 5채널(facebook·twitter·kakao·sms·copy_link)
--   event_data: { channel, page_path }
--
-- 자체 page_views 적재(Vercel Drain webhook 경로) — admin RPC가 직접 집계.
-- 인덱스: 20260508110000 마이그레이션의 idx_pv_event_name + idx_pv_event_data_gin 재사용.

-- 1) Donate 클릭 요약: target별·position별 분포 + 일자별 추이
CREATE OR REPLACE FUNCTION get_donate_click_summary(since_ts timestamptz)
RETURNS TABLE(
  total_clicks bigint,
  unique_clickers bigint,
  donate_target_clicks bigint,
  join_member_target_clicks bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) AS total_clicks,
    COUNT(DISTINCT device_id) AS unique_clickers,
    COUNT(*) FILTER (WHERE event_data->>'target' = 'donate') AS donate_target_clicks,
    COUNT(*) FILTER (WHERE event_data->>'target' = 'join_member') AS join_member_target_clicks
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'donate_click'
$$;

-- 2) Donate 클릭 — position 분포 (cta-group / footer / fullscreen-menu / 페이지 hero 등)
-- `position`은 PostgreSQL reserved keyword라 RETURNS TABLE 컬럼명에 못 씀(syntax error).
-- `position_name`으로 두고 호출부는 그대로 position 키로 매핑(20260508110000의 card_position 패턴).
CREATE OR REPLACE FUNCTION get_donate_click_position_distribution(since_ts timestamptz)
RETURNS TABLE(
  position_name text,
  target text,
  clicks bigint,
  unique_clickers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(event_data->>'position', 'unknown') AS position_name,
    COALESCE(event_data->>'target', 'unknown') AS target,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS unique_clickers
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'donate_click'
  GROUP BY 1, 2
  ORDER BY clicks DESC
$$;

-- 3) Donate 클릭 — 일자별 추이
CREATE OR REPLACE FUNCTION get_donate_click_daily(since_ts timestamptz)
RETURNS TABLE(
  day date,
  clicks bigint,
  unique_clickers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    date_trunc('day', event_timestamp)::date AS day,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS unique_clickers
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'donate_click'
  GROUP BY 1
  ORDER BY 1
$$;

-- 4) Share 클릭 요약: 총합 + 채널별 분포
CREATE OR REPLACE FUNCTION get_share_click_summary(since_ts timestamptz)
RETURNS TABLE(
  total_clicks bigint,
  unique_clickers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) AS total_clicks,
    COUNT(DISTINCT device_id) AS unique_clickers
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'share_click'
$$;

-- 5) Share 클릭 — 채널 분포
CREATE OR REPLACE FUNCTION get_share_click_channel_distribution(since_ts timestamptz)
RETURNS TABLE(
  channel text,
  clicks bigint,
  unique_clickers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(event_data->>'channel', 'unknown') AS channel,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS unique_clickers
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'share_click'
  GROUP BY 1
  ORDER BY clicks DESC
$$;

-- 6) Share 클릭 — 가장 많이 공유되는 페이지 TOP N
CREATE OR REPLACE FUNCTION get_top_shared_pages(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(
  page_path text,
  clicks bigint,
  unique_clickers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(event_data->>'page_path', '/') AS page_path,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS unique_clickers
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'share_click'
    AND event_data ? 'page_path'
  GROUP BY 1
  ORDER BY clicks DESC
  LIMIT lim
$$;

-- =============================================
-- 권한
-- =============================================

REVOKE EXECUTE ON FUNCTION get_donate_click_summary(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_donate_click_position_distribution(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_donate_click_daily(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_share_click_summary(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_share_click_channel_distribution(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_top_shared_pages(timestamptz, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_donate_click_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_donate_click_position_distribution(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_donate_click_daily(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_share_click_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_share_click_channel_distribution(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_top_shared_pages(timestamptz, int) TO service_role;
