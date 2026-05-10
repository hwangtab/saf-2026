-- =============================================
-- Phase C 트래킹 RPC — purchase_click + locale_switch
-- =============================================
--
-- purchase_click: ArtworkPurchaseCTA의 외부 쇼핑몰(Cafe24) 이동 클릭. 이미
-- TrackClick wrapper로 적재 중(legacy). admin 패널 노출 위한 RPC 신설.
-- event_data: { artwork_id, artwork_title, artist }
--
-- locale_switch: LanguageSwitcher의 한↔영 전환. 신규 트래킹.
-- event_data: { from_locale, to_locale, page_path }
--
-- outbound_click(외부 링크 일반)은 호출처 wrapping 작업이 큰 별도 PR로 분리. Phase D.

-- 1) purchase_click 요약 + TOP artwork
CREATE OR REPLACE FUNCTION get_purchase_click_summary(since_ts timestamptz)
RETURNS TABLE(
  total_clicks bigint,
  unique_clickers bigint,
  distinct_artworks bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) AS total_clicks,
    COUNT(DISTINCT device_id) AS unique_clickers,
    COUNT(DISTINCT event_data->>'artwork_id') AS distinct_artworks
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'purchase_click'
$$;

CREATE OR REPLACE FUNCTION get_top_purchase_clicked_artworks(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(
  artwork_id text,
  artwork_title text,
  artist text,
  clicks bigint,
  unique_clickers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    event_data->>'artwork_id' AS artwork_id,
    event_data->>'artwork_title' AS artwork_title,
    event_data->>'artist' AS artist,
    COUNT(*) AS clicks,
    COUNT(DISTINCT device_id) AS unique_clickers
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'purchase_click'
    AND event_data ? 'artwork_id'
  GROUP BY 1, 2, 3
  ORDER BY clicks DESC
  LIMIT lim
$$;

-- 2) locale_switch 분포 (한↔영 전환 패턴)
CREATE OR REPLACE FUNCTION get_locale_switch_summary(since_ts timestamptz)
RETURNS TABLE(
  total_switches bigint,
  unique_switchers bigint,
  ko_to_en_switches bigint,
  en_to_ko_switches bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) AS total_switches,
    COUNT(DISTINCT device_id) AS unique_switchers,
    COUNT(*) FILTER (
      WHERE event_data->>'from_locale' = 'ko' AND event_data->>'to_locale' = 'en'
    ) AS ko_to_en_switches,
    COUNT(*) FILTER (
      WHERE event_data->>'from_locale' = 'en' AND event_data->>'to_locale' = 'ko'
    ) AS en_to_ko_switches
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'locale_switch'
$$;

-- 3) locale_switch 발생 페이지 분포 (어느 페이지에서 영문 전환 시도가 많은지)
CREATE OR REPLACE FUNCTION get_locale_switch_pages(since_ts timestamptz, lim int DEFAULT 10)
RETURNS TABLE(
  page_path text,
  ko_to_en bigint,
  en_to_ko bigint,
  total bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(event_data->>'page_path', '/') AS page_path,
    COUNT(*) FILTER (
      WHERE event_data->>'from_locale' = 'ko' AND event_data->>'to_locale' = 'en'
    ) AS ko_to_en,
    COUNT(*) FILTER (
      WHERE event_data->>'from_locale' = 'en' AND event_data->>'to_locale' = 'ko'
    ) AS en_to_ko,
    COUNT(*) AS total
  FROM page_views
  WHERE event_timestamp >= since_ts
    AND event_type = 'event'
    AND event_name = 'locale_switch'
    AND event_data ? 'page_path'
  GROUP BY 1
  ORDER BY total DESC
  LIMIT lim
$$;

REVOKE EXECUTE ON FUNCTION get_purchase_click_summary(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_top_purchase_clicked_artworks(timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_locale_switch_summary(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_locale_switch_pages(timestamptz, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_purchase_click_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_top_purchase_clicked_artworks(timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_locale_switch_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION get_locale_switch_pages(timestamptz, int) TO service_role;
