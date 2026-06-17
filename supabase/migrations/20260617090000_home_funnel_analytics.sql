-- 홈 랜딩→작품상세 퍼널 계측 집계 RPC.
-- 신규 이벤트: home_section_view, hero_cta_click, home_artwork_card_click, home_cta_click.
-- 기존 commerce 이벤트(view_item·purchase_click)와 device_id로 단계 연결.

-- 1) 섹션별 노출 요약
CREATE OR REPLACE FUNCTION public.get_home_section_view_summary(since_ts timestamptz)
RETURNS TABLE(section text, views bigint, visitors bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT
    pv.event_data->>'section' AS section,
    count(*)::bigint AS views,
    count(DISTINCT pv.device_id)::bigint AS visitors
  FROM public.page_views pv
  WHERE pv.event_timestamp >= since_ts
    AND pv.event_type = 'event'
    AND pv.event_name = 'home_section_view'
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

-- 2) 홈 CTA·카드 클릭 요약 (이벤트별 + 섹션별)
CREATE OR REPLACE FUNCTION public.get_home_cta_click_summary(since_ts timestamptz)
RETURNS TABLE(event_name text, section text, clicks bigint, clickers bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT
    pv.event_name,
    pv.event_data->>'section' AS section,
    count(*)::bigint AS clicks,
    count(DISTINCT pv.device_id)::bigint AS clickers
  FROM public.page_views pv
  WHERE pv.event_timestamp >= since_ts
    AND pv.event_type = 'event'
    AND pv.event_name IN ('hero_cta_click', 'home_artwork_card_click', 'home_cta_click')
  GROUP BY 1, 2
  ORDER BY 3 DESC;
$$;

-- 3) 진입 퍼널: 홈 노출 → 홈 클릭(hero/카드) → 작품상세(view_item) → 구매클릭(purchase_click).
--    device_id 단위 단계별 도달자 수(고유 방문자). 단계 통과는 "해당 이벤트를 한 번이라도 발생"으로 정의.
CREATE OR REPLACE FUNCTION public.get_home_entry_funnel(since_ts timestamptz)
RETURNS TABLE(
  home_visitors bigint,
  home_clickers bigint,
  detail_viewers bigint,
  purchase_clickers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  WITH ev AS (
    SELECT device_id, event_name
    FROM public.page_views
    WHERE event_timestamp >= since_ts
      AND event_type = 'event'
      AND device_id IS NOT NULL
  )
  SELECT
    count(DISTINCT device_id) FILTER (WHERE event_name = 'home_section_view')::bigint,
    count(DISTINCT device_id) FILTER (WHERE event_name IN ('hero_cta_click', 'home_artwork_card_click'))::bigint,
    count(DISTINCT device_id) FILTER (WHERE event_name = 'view_item')::bigint,
    count(DISTINCT device_id) FILTER (WHERE event_name = 'purchase_click')::bigint
  FROM ev;
$$;

REVOKE ALL ON FUNCTION public.get_home_section_view_summary(timestamptz) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_home_cta_click_summary(timestamptz) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_home_entry_funnel(timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_home_section_view_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_home_cta_click_summary(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_home_entry_funnel(timestamptz) TO service_role;
