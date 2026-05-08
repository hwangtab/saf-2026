-- =============================================
-- 작가별·매거진별 commerce 기여도 — Phase C
-- =============================================
--
-- 1) 작가별 dashboard: 페이지뷰·체크아웃·결제·매출 + view→paid conversion rate
-- 2) 매거진별 attribution: 그 매거진에서 클릭된 작품들의 결제 매출 합산
--
-- attribution 방식 한계: orders 테이블에 device_id/session_id 컬럼이 없어 명시적 user
-- 매칭 불가. 단순화된 last-touch: 해당 매거진에서 클릭(story_to_artwork_click)된
-- artwork_id의 paid 주문 매출을 그 매거진에 기여로 인정. 같은 작품이 여러 매거진에서
-- 클릭됐다면 매출이 양쪽에 중복 인정됨(분배 안 함). 운영자가 매거진 효과 비교에는 충분.

-- 1) 작가별 commerce dashboard — page_views의 path에서 artwork_id 추출 → artists 매핑
-- → 작품 단위로 페이지뷰·결제·매출 집계
CREATE OR REPLACE FUNCTION get_artist_commerce_dashboard(since_ts timestamptz, lim int DEFAULT 30)
RETURNS TABLE(
  artist_id uuid,
  artist_name text,
  artwork_count bigint,
  total_views bigint,
  unique_visitors bigint,
  orders_paid bigint,
  total_revenue bigint,
  view_to_paid_rate numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH artwork_pv AS (
    SELECT
      (regexp_match(path, '^/(?:en/)?artworks/([0-9a-f-]{36})'))[1]::uuid AS artwork_id,
      COUNT(*) AS views,
      COUNT(DISTINCT device_id) AS uniq
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
      AND path ~ '^/(?:en/)?artworks/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    GROUP BY 1
  ),
  artist_pv AS (
    SELECT
      a.artist_id,
      SUM(pv.views) AS total_views,
      SUM(pv.uniq) AS unique_visitors
    FROM artwork_pv pv
    JOIN artworks a ON a.id = pv.artwork_id
    WHERE a.artist_id IS NOT NULL
    GROUP BY a.artist_id
  ),
  artist_orders AS (
    SELECT
      a.artist_id,
      COUNT(*) FILTER (WHERE is_paid_status(o.status) OR o.paid_at IS NOT NULL) AS orders_paid,
      COALESCE(
        SUM(o.total_amount) FILTER (WHERE is_paid_status(o.status) OR o.paid_at IS NOT NULL),
        0
      ) AS revenue
    FROM orders o
    JOIN artworks a ON a.id = o.artwork_id
    WHERE o.created_at >= since_ts
      AND a.artist_id IS NOT NULL
    GROUP BY a.artist_id
  ),
  artist_artwork_count AS (
    SELECT artist_id, COUNT(*) AS cnt FROM artworks WHERE artist_id IS NOT NULL GROUP BY artist_id
  )
  SELECT
    ar.id AS artist_id,
    ar.name_ko AS artist_name,
    COALESCE(aac.cnt, 0) AS artwork_count,
    COALESCE(apv.total_views, 0) AS total_views,
    COALESCE(apv.unique_visitors, 0) AS unique_visitors,
    COALESCE(ao.orders_paid, 0) AS orders_paid,
    COALESCE(ao.revenue, 0) AS total_revenue,
    ROUND(
      (COALESCE(ao.orders_paid, 0)::numeric / NULLIF(apv.total_views, 0)) * 100,
      2
    ) AS view_to_paid_rate
  FROM artists ar
  LEFT JOIN artist_pv apv ON apv.artist_id = ar.id
  LEFT JOIN artist_orders ao ON ao.artist_id = ar.id
  LEFT JOIN artist_artwork_count aac ON aac.artist_id = ar.id
  WHERE COALESCE(apv.total_views, 0) > 0 OR COALESCE(ao.revenue, 0) > 0
  ORDER BY COALESCE(ao.revenue, 0) DESC, COALESCE(apv.total_views, 0) DESC
  LIMIT lim
$$;

-- 2) 매거진별 매출 attribution — 매거진에서 클릭된 작품들의 결제 매출
-- attribution 한계 명시: device_id/session_id로 user 매칭 불가, 시간 기반 attribution도
-- 무거워 단순 last-touch (이 매거진에서 클릭된 artwork의 paid 매출). 운영자 비교용.
CREATE OR REPLACE FUNCTION get_story_attributed_revenue(since_ts timestamptz, lim int DEFAULT 20)
RETURNS TABLE(
  story_slug text,
  total_clicks bigint,
  unique_clickers bigint,
  attributed_orders_paid bigint,
  attributed_revenue bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH story_clicks AS (
    SELECT
      COALESCE(
        event_data->>'story_slug',
        regexp_replace(path, '^/(?:en/)?stories/', '')
      ) AS story_slug,
      (event_data->>'artwork_id')::uuid AS artwork_id,
      device_id
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'event'
      AND event_name = 'story_to_artwork_click'
      AND event_data ? 'artwork_id'
  ),
  story_artworks AS (
    SELECT
      story_slug,
      artwork_id,
      COUNT(*) AS clicks,
      COUNT(DISTINCT device_id) AS clickers
    FROM story_clicks
    GROUP BY 1, 2
  ),
  artwork_revenue AS (
    SELECT
      artwork_id,
      COUNT(*) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL) AS orders_paid,
      COALESCE(
        SUM(total_amount) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL),
        0
      ) AS revenue
    FROM orders
    WHERE created_at >= since_ts
    GROUP BY artwork_id
  )
  SELECT
    sa.story_slug,
    SUM(sa.clicks)::bigint AS total_clicks,
    SUM(sa.clickers)::bigint AS unique_clickers,
    COALESCE(SUM(ar.orders_paid), 0)::bigint AS attributed_orders_paid,
    COALESCE(SUM(ar.revenue), 0)::bigint AS attributed_revenue
  FROM story_artworks sa
  LEFT JOIN artwork_revenue ar ON ar.artwork_id = sa.artwork_id
  GROUP BY sa.story_slug
  ORDER BY attributed_revenue DESC, total_clicks DESC
  LIMIT lim
$$;

-- =============================================
-- 권한
-- =============================================

REVOKE EXECUTE ON FUNCTION get_artist_commerce_dashboard(timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_story_attributed_revenue(timestamptz, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_artist_commerce_dashboard(timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_story_attributed_revenue(timestamptz, int) TO service_role;
