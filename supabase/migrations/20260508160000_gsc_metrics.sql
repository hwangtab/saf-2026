-- =============================================
-- Google Search Console 데이터 캐시 테이블 — Phase D
-- =============================================
--
-- GSC API는 호출당 200ms+ 걸리고 quota 제한도 있어 매번 fetch 비효율. 매일 cron으로
-- 한 번 fetch해 Supabase에 캐시. admin/analytics는 이 테이블에서 즉시 조회.
--
-- 데이터 모델: query × page × date 단위 row. 같은 query/page가 여러 날짜에 걸쳐 누적.
-- 30일치만 보관 (그 이상은 GSC도 최대 16개월이고, 분석엔 30일이 충분).

CREATE TABLE IF NOT EXISTS gsc_metrics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- GSC 데이터의 일자 (KST·UTC 무관 — GSC가 보내는 그대로)
  date date NOT NULL,
  -- 검색 키워드 (NULL이면 'aggregate by page' 모드)
  query text,
  -- 클릭된 페이지 (URL prefix property면 full URL, domain property면 path만 가능)
  page text,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  ctr numeric(5, 4) NOT NULL DEFAULT 0,
  position numeric(5, 2) NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  -- 같은 (date, query, page) 조합은 하나만 — 재fetch 시 upsert
  UNIQUE (date, query, page)
);

CREATE INDEX IF NOT EXISTS idx_gsc_date ON gsc_metrics (date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_query ON gsc_metrics (query) WHERE query IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gsc_page ON gsc_metrics (page) WHERE page IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gsc_clicks ON gsc_metrics (clicks DESC) WHERE clicks > 0;

ALTER TABLE gsc_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read gsc_metrics"
  ON gsc_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT ALL ON gsc_metrics TO service_role;
GRANT USAGE, SELECT ON SEQUENCE gsc_metrics_id_seq TO service_role;

-- =============================================
-- 분석용 RPC
-- =============================================

-- 1) 검색 키워드 TOP — impressions 순. CTR 낮은 키워드는 메타태그 개선 신호
CREATE OR REPLACE FUNCTION get_gsc_top_queries(since_date date, lim int DEFAULT 30)
RETURNS TABLE(
  query text,
  impressions bigint,
  clicks bigint,
  ctr numeric,
  avg_position numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    query,
    SUM(impressions)::bigint AS impressions,
    SUM(clicks)::bigint AS clicks,
    ROUND(
      (SUM(clicks)::numeric / NULLIF(SUM(impressions), 0)) * 100,
      2
    ) AS ctr,
    ROUND(AVG(position)::numeric, 1) AS avg_position
  FROM gsc_metrics
  WHERE date >= since_date
    AND query IS NOT NULL
  GROUP BY query
  ORDER BY impressions DESC
  LIMIT lim
$$;

-- 2) 페이지별 organic traffic — 어떤 페이지가 검색에서 가장 많이 잡히는지
CREATE OR REPLACE FUNCTION get_gsc_top_pages(since_date date, lim int DEFAULT 30)
RETURNS TABLE(
  page text,
  impressions bigint,
  clicks bigint,
  ctr numeric,
  avg_position numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    page,
    SUM(impressions)::bigint AS impressions,
    SUM(clicks)::bigint AS clicks,
    ROUND(
      (SUM(clicks)::numeric / NULLIF(SUM(impressions), 0)) * 100,
      2
    ) AS ctr,
    ROUND(AVG(position)::numeric, 1) AS avg_position
  FROM gsc_metrics
  WHERE date >= since_date
    AND page IS NOT NULL
  GROUP BY page
  ORDER BY clicks DESC, impressions DESC
  LIMIT lim
$$;

-- 3) CTR 낮은 키워드 — 노출은 많은데 클릭률 낮은 keyword. 메타태그·title 개선 신호
CREATE OR REPLACE FUNCTION get_gsc_low_ctr_queries(
  since_date date,
  min_impressions int DEFAULT 50,
  lim int DEFAULT 20
)
RETURNS TABLE(
  query text,
  impressions bigint,
  clicks bigint,
  ctr numeric,
  avg_position numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    query,
    SUM(impressions)::bigint AS impressions,
    SUM(clicks)::bigint AS clicks,
    ROUND(
      (SUM(clicks)::numeric / NULLIF(SUM(impressions), 0)) * 100,
      2
    ) AS ctr,
    ROUND(AVG(position)::numeric, 1) AS avg_position
  FROM gsc_metrics
  WHERE date >= since_date
    AND query IS NOT NULL
  GROUP BY query
  HAVING SUM(impressions) >= min_impressions
  ORDER BY ctr ASC, impressions DESC
  LIMIT lim
$$;

-- 4) 일별 organic traffic 추이 — 검색 트래픽 일별 변화
CREATE OR REPLACE FUNCTION get_gsc_daily_trend(since_date date)
RETURNS TABLE(
  day date,
  impressions bigint,
  clicks bigint,
  ctr numeric,
  avg_position numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    date AS day,
    SUM(impressions)::bigint AS impressions,
    SUM(clicks)::bigint AS clicks,
    ROUND(
      (SUM(clicks)::numeric / NULLIF(SUM(impressions), 0)) * 100,
      2
    ) AS ctr,
    ROUND(AVG(position)::numeric, 1) AS avg_position
  FROM gsc_metrics
  WHERE date >= since_date
  GROUP BY 1
  ORDER BY 1
$$;

-- 5) GSC fetch 상태 — 마지막 sync 시점
CREATE OR REPLACE FUNCTION get_gsc_sync_status()
RETURNS TABLE(
  latest_date date,
  oldest_date date,
  total_rows bigint,
  last_fetched timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    MAX(date) AS latest_date,
    MIN(date) AS oldest_date,
    COUNT(*)::bigint AS total_rows,
    MAX(fetched_at) AS last_fetched
  FROM gsc_metrics
$$;

-- =============================================
-- 권한
-- =============================================

REVOKE EXECUTE ON FUNCTION get_gsc_top_queries(date, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_gsc_top_pages(date, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_gsc_low_ctr_queries(date, int, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_gsc_daily_trend(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_gsc_sync_status() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_gsc_top_queries(date, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_gsc_top_pages(date, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_gsc_low_ctr_queries(date, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION get_gsc_daily_trend(date) TO service_role;
GRANT EXECUTE ON FUNCTION get_gsc_sync_status() TO service_role;
