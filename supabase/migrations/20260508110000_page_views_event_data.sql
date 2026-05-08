-- =============================================
-- page_views: event_data + route 컬럼 추가
-- =============================================
--
-- 배경: Vercel Analytics Drain v2 schema는 custom event의 properties를 JSON-stringified
-- `eventData` 필드로 보내고 (예: track('story_to_artwork_click', { artwork_id, source, ... }))
-- 또한 동적 라우트 패턴은 `route` 필드(예: '/stories/[slug]')로 별도 제공.
-- 기존 webhook handler는 둘 다 drop했고, 본 마이그레이션 + 후속 코드 변경으로 보존하기 시작함.
--
-- 신규 이벤트만 적용: 과거 이벤트는 NULL로 유지 (회복 불가, 신규 수집부터 분석).

ALTER TABLE page_views
  ADD COLUMN IF NOT EXISTS event_data jsonb;

ALTER TABLE page_views
  ADD COLUMN IF NOT EXISTS route text;

-- cross-link 분석용 인덱스
CREATE INDEX IF NOT EXISTS idx_pv_event_name
  ON page_views (event_name, event_timestamp DESC)
  WHERE event_type = 'event';

CREATE INDEX IF NOT EXISTS idx_pv_event_data_gin
  ON page_views USING GIN (event_data jsonb_path_ops)
  WHERE event_data IS NOT NULL;

-- =============================================
-- Cross-link 분석용 RPC 함수
-- =============================================

-- 1) cross-link 요약: 매거진→작품 / 작품→매거진 양 방향 클릭 총수 + unique device
CREATE OR REPLACE FUNCTION get_cross_link_summary(since_ts timestamptz)
RETURNS TABLE(
  story_to_artwork_clicks bigint,
  story_to_artwork_visitors bigint,
  artwork_to_story_clicks bigint,
  artwork_to_story_visitors bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) FILTER (WHERE event_name = 'story_to_artwork_click') AS story_to_artwork_clicks,
    COUNT(DISTINCT device_id) FILTER (WHERE event_name = 'story_to_artwork_click')
      AS story_to_artwork_visitors,
    COUNT(*) FILTER (WHERE event_name = 'artwork_to_story_click') AS artwork_to_story_clicks,
    COUNT(DISTINCT device_id) FILTER (WHERE event_name = 'artwork_to_story_click')
      AS artwork_to_story_visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name IN ('story_to_artwork_click', 'artwork_to_story_click')
$$;

-- 2) 매거진→작품 conversion이 가장 잘 일어나는 stories TOP N
CREATE OR REPLACE FUNCTION get_top_converting_stories(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(
  story_slug text,
  clicks bigint,
  visitors bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    -- event_data가 있으면 거기서, 없으면 path에서 슬러그 추출 (legacy 호환)
    COALESCE(
      event_data->>'story_slug',
      regexp_replace(path, '^/(?:en/)?stories/', '')
    ) AS story_slug,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'story_to_artwork_click'
  GROUP BY 1
  ORDER BY clicks DESC
  LIMIT lim
$$;

-- 3) 매거진에서 클릭 받은 작품 TOP N
CREATE OR REPLACE FUNCTION get_top_clicked_artworks_from_stories(
  since_ts timestamptz,
  lim int DEFAULT 10
)
RETURNS TABLE(
  artwork_id text,
  artist text,
  clicks bigint,
  visitors bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    event_data->>'artwork_id' AS artwork_id,
    event_data->>'artist' AS artist,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'story_to_artwork_click'
    AND event_data ? 'artwork_id'
  GROUP BY 1, 2
  ORDER BY clicks DESC
  LIMIT lim
$$;

-- 4) source(매칭 tier)별 분포
CREATE OR REPLACE FUNCTION get_story_to_artwork_source_distribution(since_ts timestamptz)
RETURNS TABLE(
  source text,
  clicks bigint,
  visitors bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(event_data->>'source', 'unknown') AS source,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'story_to_artwork_click'
  GROUP BY 1
  ORDER BY clicks DESC
$$;

-- 5) 작품 → 매거진 클릭이 가장 많이 발생한 작품 TOP N
CREATE OR REPLACE FUNCTION get_top_artwork_to_story_artworks(
  since_ts timestamptz,
  lim int DEFAULT 10
)
RETURNS TABLE(
  artwork_id text,
  artist text,
  clicks bigint,
  visitors bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    event_data->>'artwork_id' AS artwork_id,
    event_data->>'artwork_artist' AS artist,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS visitors
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'artwork_to_story_click'
    AND event_data ? 'artwork_id'
  GROUP BY 1, 2
  ORDER BY clicks DESC
  LIMIT lim
$$;

-- 6) position(카드 순서)별 클릭 분포
CREATE OR REPLACE FUNCTION get_story_to_artwork_position_distribution(since_ts timestamptz)
RETURNS TABLE(
  position int,
  clicks bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    (event_data->>'position')::int AS position,
    COUNT(*) AS clicks
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'story_to_artwork_click'
    AND event_data ? 'position'
  GROUP BY 1
  ORDER BY 1
$$;

-- =============================================
-- 권한
-- =============================================

REVOKE EXECUTE ON FUNCTION get_cross_link_summary(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_top_converting_stories(timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_top_clicked_artworks_from_stories(timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_story_to_artwork_source_distribution(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_top_artwork_to_story_artworks(timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_story_to_artwork_position_distribution(timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_cross_link_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_top_converting_stories(timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_top_clicked_artworks_from_stories(timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_story_to_artwork_source_distribution(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_top_artwork_to_story_artworks(timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_story_to_artwork_position_distribution(timestamptz) TO service_role;
