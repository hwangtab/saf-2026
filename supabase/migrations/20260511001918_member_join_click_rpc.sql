-- =============================================
-- 조합원 가입 클릭 RPC (donate_click rename + 단순화)
-- =============================================
--
-- 배경: 후원함(socialfunch DONATE) 캠페인은 이미 종료. 측정 대상은 조합원 가입(JOIN_MEMBER)
-- 단일 destination이라 target='donate' vs 'join_member' 분기 불필요. 이벤트명도 의미
-- 정확하게 `member_join_click`으로 rename. 직전 마이그레이션(20260510230757)의 donate_*
-- 함수들은 drop. 적재된 데이터 0건이라 손실 없음.

-- 기존 donate_* RPC drop
DROP FUNCTION IF EXISTS get_donate_click_summary(timestamptz);
DROP FUNCTION IF EXISTS get_donate_click_position_distribution(timestamptz);
DROP FUNCTION IF EXISTS get_donate_click_daily(timestamptz);

-- 1) 요약 — 총 클릭 + 고유 클릭자 (target 분기 없음)
CREATE OR REPLACE FUNCTION get_member_join_click_summary(since_ts timestamptz)
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
    AND event_name = 'member_join_click'
$$;

-- 2) position 분포 (어드민 패널의 conversion source 식별 — 어느 페이지·위치 CTA가 효과적인가)
CREATE OR REPLACE FUNCTION get_member_join_click_position_distribution(since_ts timestamptz)
RETURNS TABLE(
  position_name text,
  clicks bigint,
  unique_clickers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(event_data->>'position', 'unknown') AS position_name,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS unique_clickers
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'member_join_click'
  GROUP BY 1
  ORDER BY clicks DESC
$$;

-- 3) 일자별 추이
CREATE OR REPLACE FUNCTION get_member_join_click_daily(since_ts timestamptz)
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
    AND event_name = 'member_join_click'
  GROUP BY 1
  ORDER BY 1
$$;

REVOKE EXECUTE ON FUNCTION get_member_join_click_summary(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_member_join_click_position_distribution(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_member_join_click_daily(timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_member_join_click_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_member_join_click_position_distribution(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_member_join_click_daily(timestamptz) TO service_role;
