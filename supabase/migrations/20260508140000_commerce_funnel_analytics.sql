-- =============================================
-- Commerce Funnel — 작품 페이지뷰 → 체크아웃 → 결제
-- =============================================
--
-- Phase B: 경영자가 매출 의사결정에 직결되는 funnel 분석.
-- 단계 정의:
--   Stage 1: 작품 detail 페이지뷰 — page_views.path LIKE '/artworks/{uuid}'
--   Stage 2: 체크아웃 진입 — page_views.path LIKE '/checkout/{uuid}'
--   Stage 3: 주문 생성 — orders 레코드 (모든 status)
--   Stage 4: 결제 완료 — orders.paid_at IS NOT NULL 또는 status가 paid 이후 단계
--
-- artwork_id 추출: path 정규식 `/artworks/{uuid}` 매칭. SELECT path가 있을 때 정규식으로
-- artwork_id 분리. checkout path는 `/checkout/{uuid}` 동일.

-- 결제 완료로 간주할 status 목록 (paid_at 또는 이 status면 결제됨)
-- pending_payment·awaiting_deposit·cancelled·refunded·refund_requested는 미결제.
-- paid 이후 단계(preparing/shipped/delivered/completed)는 모두 결제됨.
CREATE OR REPLACE FUNCTION is_paid_status(s text)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
  SELECT s IN ('paid', 'preparing', 'shipped', 'delivered', 'completed')
$$;

REVOKE EXECUTE ON FUNCTION is_paid_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_paid_status(text) TO service_role;

-- 1) Funnel 전체 요약 — 각 단계별 unique 수 + 총 매출
CREATE OR REPLACE FUNCTION get_commerce_funnel_summary(since_ts timestamptz)
RETURNS TABLE(
  artwork_views bigint,
  unique_artwork_visitors bigint,
  checkout_views bigint,
  unique_checkout_visitors bigint,
  orders_created bigint,
  orders_paid bigint,
  total_revenue bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH stage1 AS (
    SELECT
      COUNT(*) AS views,
      COUNT(DISTINCT device_id) AS visitors
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
      AND path ~ '^/(?:en/)?artworks/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  ),
  stage2 AS (
    SELECT
      COUNT(*) AS views,
      COUNT(DISTINCT device_id) AS visitors
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
      AND path ~ '^/(?:en/)?checkout/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  ),
  stage3 AS (
    SELECT
      COUNT(*) AS created,
      COUNT(*) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL) AS paid,
      COALESCE(SUM(total_amount) FILTER (WHERE is_paid_status(status) OR paid_at IS NOT NULL), 0) AS revenue
    FROM orders
    WHERE created_at >= since_ts
  )
  SELECT
    s1.views, s1.visitors,
    s2.views, s2.visitors,
    s3.created, s3.paid, s3.revenue
  FROM stage1 s1, stage2 s2, stage3 s3
$$;

-- 2) 작품별 funnel — 어떤 작품이 페이지뷰 많은데 안 팔리는지 식별
CREATE OR REPLACE FUNCTION get_top_artwork_funnel(since_ts timestamptz, lim int DEFAULT 20)
RETURNS TABLE(
  artwork_id text,
  views bigint,
  unique_visitors bigint,
  checkout_views bigint,
  orders_created bigint,
  orders_paid bigint,
  revenue bigint,
  view_to_checkout_rate numeric,
  checkout_to_paid_rate numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH artwork_pageviews AS (
    SELECT
      (regexp_match(path, '^/(?:en/)?artworks/([0-9a-f-]{36})'))[1] AS aid,
      COUNT(*) AS views,
      COUNT(DISTINCT device_id) AS uniq
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
      AND path ~ '^/(?:en/)?artworks/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    GROUP BY 1
  ),
  artwork_checkouts AS (
    SELECT
      (regexp_match(path, '^/(?:en/)?checkout/([0-9a-f-]{36})'))[1] AS aid,
      COUNT(*) AS checkout_views
    FROM page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'pageview'
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
    GROUP BY artwork_id
  )
  SELECT
    COALESCE(pv.aid, co.aid, ord.aid) AS artwork_id,
    COALESCE(pv.views, 0) AS views,
    COALESCE(pv.uniq, 0) AS unique_visitors,
    COALESCE(co.checkout_views, 0) AS checkout_views,
    COALESCE(ord.created, 0) AS orders_created,
    COALESCE(ord.paid, 0) AS orders_paid,
    COALESCE(ord.revenue, 0) AS revenue,
    ROUND(
      (COALESCE(co.checkout_views, 0)::numeric / NULLIF(pv.views, 0)) * 100,
      1
    ) AS view_to_checkout_rate,
    ROUND(
      (COALESCE(ord.paid, 0)::numeric / NULLIF(co.checkout_views, 0)) * 100,
      1
    ) AS checkout_to_paid_rate
  FROM artwork_pageviews pv
  FULL OUTER JOIN artwork_checkouts co ON pv.aid = co.aid
  FULL OUTER JOIN artwork_orders ord ON COALESCE(pv.aid, co.aid) = ord.aid
  WHERE COALESCE(pv.views, 0) >= 10  -- 노이즈 제거: 10회 미만 페이지뷰 제외
  ORDER BY COALESCE(ord.revenue, 0) DESC, COALESCE(pv.views, 0) DESC
  LIMIT lim
$$;

-- 3) 일별 매출 추이 — paid_at 기준
CREATE OR REPLACE FUNCTION get_revenue_daily_trend(since_ts timestamptz)
RETURNS TABLE(
  day date,
  orders_paid bigint,
  revenue bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    date_trunc('day', COALESCE(paid_at, created_at))::date AS day,
    COUNT(*) AS orders_paid,
    COALESCE(SUM(total_amount), 0) AS revenue
  FROM orders
  WHERE COALESCE(paid_at, created_at) >= since_ts
    AND (is_paid_status(status) OR paid_at IS NOT NULL)
  GROUP BY 1
  ORDER BY 1
$$;

-- =============================================
-- 권한
-- =============================================

REVOKE EXECUTE ON FUNCTION get_commerce_funnel_summary(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_top_artwork_funnel(timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_revenue_daily_trend(timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_commerce_funnel_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_top_artwork_funnel(timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_revenue_daily_trend(timestamptz) TO service_role;
