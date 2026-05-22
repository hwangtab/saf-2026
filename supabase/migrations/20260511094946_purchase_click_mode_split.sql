-- purchase_click RPC를 mode 분리 집계로 확장.
-- 배경: ArtworkPurchaseCTA의 두 분기(자체 토스결제 vs 외부 쇼핑몰)가 같은 purchase_click
-- 이벤트로 적재되어 어드민 패널이 합산 표시. 'mode' 페이로드 추가로 destination 분리.
-- 직전 적재 데이터는 mode 없음 — mode IS NULL은 'legacy' 분류.

DROP FUNCTION IF EXISTS get_purchase_click_summary(timestamptz);
CREATE OR REPLACE FUNCTION get_purchase_click_summary(since_ts timestamptz)
RETURNS TABLE(
  total_clicks bigint,
  unique_clickers bigint,
  distinct_artworks bigint,
  toss_clicks bigint,
  external_clicks bigint,
  legacy_clicks bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) AS total_clicks,
    COUNT(DISTINCT device_id) AS unique_clickers,
    COUNT(DISTINCT event_data->>'artwork_id') AS distinct_artworks,
    COUNT(*) FILTER (WHERE event_data->>'mode' = 'toss') AS toss_clicks,
    COUNT(*) FILTER (WHERE event_data->>'mode' = 'external') AS external_clicks,
    COUNT(*) FILTER (WHERE event_data->>'mode' IS NULL) AS legacy_clicks
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'purchase_click'
$$;

-- TOP artwork에도 mode breakdown 추가 — 어떤 작품이 어느 destination으로 clicks
DROP FUNCTION IF EXISTS get_top_purchase_clicked_artworks(timestamptz, int);
CREATE OR REPLACE FUNCTION get_top_purchase_clicked_artworks(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(
  artwork_id text,
  artwork_title text,
  artist text,
  clicks bigint,
  unique_clickers bigint,
  toss_clicks bigint,
  external_clicks bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    event_data->>'artwork_id' AS artwork_id,
    event_data->>'artwork_title' AS artwork_title,
    event_data->>'artist' AS artist,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS unique_clickers,
    COUNT(*) FILTER (WHERE event_data->>'mode' = 'toss') AS toss_clicks,
    COUNT(*) FILTER (WHERE event_data->>'mode' = 'external') AS external_clicks
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'purchase_click'
    AND event_data ? 'artwork_id'
  GROUP BY 1, 2, 3
  ORDER BY clicks DESC
  LIMIT lim
$$;
