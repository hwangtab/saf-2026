-- commerce RPC들에서 admin/test buyer 자동 제외.
-- 배경: orders 78건 중 황경하(contact@kosmart.org, hwangtab@gmail.com) buyer 61건.
-- production funnel·매출 통계가 테스트 주문에 오염됨. helper function + 5 RPC 수정.

-- helper: 관리자/테스트 이메일 패턴. 향후 admin 추가 시 이 함수만 수정.
CREATE OR REPLACE FUNCTION is_test_buyer_email(email text) RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
  SELECT email IS NOT NULL AND email IN ('contact@kosmart.org', 'hwangtab@gmail.com');
$$;

-- commerce RPC들이 SECURITY DEFINER 함수 안에서 호출하므로 explicit grant 필요.
GRANT EXECUTE ON FUNCTION is_test_buyer_email(text) TO service_role;

-- 1) commerce funnel summary
CREATE OR REPLACE FUNCTION get_commerce_funnel_summary(since_ts timestamptz)
RETURNS TABLE(
  artwork_views bigint, unique_artwork_visitors bigint,
  checkout_views bigint, unique_checkout_visitors bigint,
  orders_created bigint, orders_paid bigint, total_revenue bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH stage1 AS (
    SELECT COUNT(*) AS views, COUNT(DISTINCT device_id) AS visitors
    FROM page_views
    WHERE event_timestamp >= since_ts AND event_type = 'pageview'
      AND path ~ '^/(?:en/)?artworks/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  ),
  stage2 AS (
    SELECT COUNT(*) AS views, COUNT(DISTINCT device_id) AS visitors
    FROM page_views
    WHERE event_timestamp >= since_ts AND event_type = 'pageview'
      AND path ~ '^/(?:en/)?checkout/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  ),
  stage3 AS (
    SELECT
      COUNT(*) AS created,
      COUNT(*) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL) AS paid,
      COALESCE(SUM(total_amount) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL), 0) AS revenue
    FROM orders
    WHERE created_at >= since_ts
      AND NOT is_test_buyer_email(buyer_email)
  )
  SELECT s1.views, s1.visitors, s2.views, s2.visitors, s3.created, s3.paid, s3.revenue
  FROM stage1 s1, stage2 s2, stage3 s3
$$;

-- 2) top artwork funnel
CREATE OR REPLACE FUNCTION get_top_artwork_funnel(since_ts timestamptz, lim int DEFAULT 20)
RETURNS TABLE(
  artwork_id text, views bigint, unique_visitors bigint,
  checkout_views bigint, orders_created bigint, orders_paid bigint, revenue bigint,
  view_to_checkout_rate numeric, checkout_to_paid_rate numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH artwork_pageviews AS (
    SELECT
      (regexp_match(path, '^/(?:en/)?artworks/([0-9a-f-]{36})'))[1] AS aid,
      COUNT(*) AS views, COUNT(DISTINCT device_id) AS uniq
    FROM page_views
    WHERE event_timestamp >= since_ts AND event_type = 'pageview'
      AND path ~ '^/(?:en/)?artworks/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    GROUP BY 1
  ),
  artwork_checkouts AS (
    SELECT
      (regexp_match(path, '^/(?:en/)?checkout/([0-9a-f-]{36})'))[1] AS aid,
      COUNT(*) AS checkout_views
    FROM page_views
    WHERE event_timestamp >= since_ts AND event_type = 'pageview'
      AND path ~ '^/(?:en/)?checkout/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    GROUP BY 1
  ),
  artwork_orders AS (
    SELECT
      artwork_id::text AS aid,
      COUNT(*) AS created,
      COUNT(*) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL) AS paid,
      COALESCE(SUM(total_amount) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL), 0) AS revenue
    FROM orders
    WHERE created_at >= since_ts
      AND NOT is_test_buyer_email(buyer_email)
    GROUP BY artwork_id
  )
  SELECT
    COALESCE(pv.aid, co.aid, ord.aid) AS artwork_id,
    COALESCE(pv.views, 0), COALESCE(pv.uniq, 0),
    COALESCE(co.checkout_views, 0),
    COALESCE(ord.created, 0), COALESCE(ord.paid, 0), COALESCE(ord.revenue, 0),
    ROUND((COALESCE(co.checkout_views, 0)::numeric / NULLIF(pv.views, 0)) * 100, 1),
    ROUND((COALESCE(ord.paid, 0)::numeric / NULLIF(co.checkout_views, 0)) * 100, 1)
  FROM artwork_pageviews pv
  FULL OUTER JOIN artwork_checkouts co ON pv.aid = co.aid
  FULL OUTER JOIN artwork_orders ord ON COALESCE(pv.aid, co.aid) = ord.aid
  WHERE COALESCE(pv.views, 0) >= 10
  ORDER BY COALESCE(ord.revenue, 0) DESC, COALESCE(pv.views, 0) DESC
  LIMIT lim
$$;

-- 3) revenue daily trend
CREATE OR REPLACE FUNCTION get_revenue_daily_trend(since_ts timestamptz)
RETURNS TABLE(day date, orders_paid bigint, revenue bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    date_trunc('day', COALESCE(paid_at, created_at))::date AS day,
    COUNT(*) AS orders_paid,
    COALESCE(SUM(total_amount), 0) AS revenue
  FROM orders
  WHERE COALESCE(paid_at, created_at) >= since_ts
    AND (is_paid_status(status) OR paid_at IS NOT NULL)
    AND NOT is_test_buyer_email(buyer_email)
  GROUP BY 1
  ORDER BY 1
$$;

-- 4) artist commerce dashboard
CREATE OR REPLACE FUNCTION get_artist_commerce_dashboard(since_ts timestamptz, lim int DEFAULT 30)
RETURNS TABLE(
  artist_id uuid, artist_name text, artwork_count bigint,
  total_views bigint, unique_visitors bigint,
  orders_paid bigint, total_revenue bigint, view_to_paid_rate numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH artwork_pv AS (
    SELECT
      (regexp_match(path, '^/(?:en/)?artworks/([0-9a-f-]{36})'))[1]::uuid AS artwork_id,
      COUNT(*) AS views, COUNT(DISTINCT device_id) AS uniq
    FROM page_views
    WHERE event_timestamp >= since_ts AND event_type = 'pageview'
      AND path ~ '^/(?:en/)?artworks/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    GROUP BY 1
  ),
  artist_pv AS (
    SELECT a.artist_id, SUM(pv.views) AS total_views, SUM(pv.uniq) AS unique_visitors
    FROM artwork_pv pv JOIN artworks a ON a.id = pv.artwork_id
    WHERE a.artist_id IS NOT NULL GROUP BY a.artist_id
  ),
  artist_orders AS (
    SELECT
      a.artist_id,
      COUNT(*) FILTER (WHERE is_paid_status(o.status) OR o.paid_at IS NOT NULL) AS orders_paid,
      COALESCE(SUM(o.total_amount) FILTER (WHERE is_paid_status(o.status) OR o.paid_at IS NOT NULL), 0) AS revenue
    FROM orders o JOIN artworks a ON a.id = o.artwork_id
    WHERE o.created_at >= since_ts AND a.artist_id IS NOT NULL
      AND NOT is_test_buyer_email(o.buyer_email)
    GROUP BY a.artist_id
  ),
  artist_artwork_count AS (
    SELECT artist_id, COUNT(*) AS cnt FROM artworks WHERE artist_id IS NOT NULL GROUP BY artist_id
  )
  SELECT
    ar.id, ar.name_ko,
    COALESCE(aac.cnt, 0),
    COALESCE(apv.total_views, 0), COALESCE(apv.unique_visitors, 0),
    COALESCE(ao.orders_paid, 0), COALESCE(ao.revenue, 0),
    ROUND((COALESCE(ao.orders_paid, 0)::numeric / NULLIF(apv.total_views, 0)) * 100, 2)
  FROM artists ar
  LEFT JOIN artist_pv apv ON apv.artist_id = ar.id
  LEFT JOIN artist_orders ao ON ao.artist_id = ar.id
  LEFT JOIN artist_artwork_count aac ON aac.artist_id = ar.id
  WHERE COALESCE(apv.total_views, 0) > 0 OR COALESCE(ao.revenue, 0) > 0
  ORDER BY COALESCE(ao.revenue, 0) DESC, COALESCE(apv.total_views, 0) DESC
  LIMIT lim
$$;

-- 5) story attributed revenue
CREATE OR REPLACE FUNCTION get_story_attributed_revenue(since_ts timestamptz, lim int DEFAULT 20)
RETURNS TABLE(
  story_slug text, total_clicks bigint, unique_clickers bigint,
  attributed_orders_paid bigint, attributed_revenue bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH story_clicks AS (
    SELECT
      COALESCE(event_data->>'story_slug', regexp_replace(path, '^/(?:en/)?stories/', '')) AS story_slug,
      (event_data->>'artwork_id')::uuid AS artwork_id,
      device_id
    FROM page_views
    WHERE event_timestamp >= since_ts AND event_type = 'event'
      AND event_name = 'story_to_artwork_click' AND event_data ? 'artwork_id'
  ),
  story_artworks AS (
    SELECT story_slug, artwork_id,
      COUNT(*) AS clicks, COUNT(DISTINCT device_id) AS clickers
    FROM story_clicks GROUP BY 1, 2
  ),
  artwork_revenue AS (
    SELECT artwork_id,
      COUNT(*) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL) AS orders_paid,
      COALESCE(SUM(total_amount) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL), 0) AS revenue
    FROM orders
    WHERE created_at >= since_ts
      AND NOT is_test_buyer_email(buyer_email)
    GROUP BY artwork_id
  )
  SELECT
    sa.story_slug,
    SUM(sa.clicks)::bigint, SUM(sa.clickers)::bigint,
    COALESCE(SUM(ar.orders_paid), 0)::bigint,
    COALESCE(SUM(ar.revenue), 0)::bigint
  FROM story_artworks sa
  LEFT JOIN artwork_revenue ar ON ar.artwork_id = sa.artwork_id
  GROUP BY sa.story_slug
  ORDER BY attributed_revenue DESC, total_clicks DESC
  LIMIT lim
$$;
