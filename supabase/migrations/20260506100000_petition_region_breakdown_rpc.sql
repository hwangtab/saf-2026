-- 청원 지역별 분포 집계 RPC
-- 목적: PostgREST 'db-max-rows=1000' 서버 한도 때문에 admin 페이지에서
-- petition_signatures를 select 한 뒤 in-memory로 집계하면 1000명만 표본이 잡혀
-- 실제값(예: 서울 1595)이 부분집계(441)로 잘리던 문제 해결.
-- DB에서 직접 GROUP BY 집계해 결과 row 수가 region 수(=18) 정도로 줄어 한도 무관.

CREATE OR REPLACE FUNCTION public.get_petition_region_breakdown(p_slug text)
RETURNS TABLE(region_top text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT region_top, COUNT(*)::bigint AS count
  FROM public.petition_signatures
  WHERE petition_slug = p_slug
    AND is_masked = false
    AND region_top IS NOT NULL
  GROUP BY region_top
  ORDER BY COUNT(*) DESC;
$$;

COMMENT ON FUNCTION public.get_petition_region_breakdown(text) IS
  '청원의 지역별 서명 분포(unmasked만)를 DB에서 집계해 반환. '
  'admin 페이지에서 petition_signatures row를 직접 fetch한 뒤 in-memory 집계 시 '
  'PostgREST db-max-rows=1000 한도에 걸려 잘리는 문제를 우회하기 위한 server-side aggregation.';

-- 권한: 일반 사용자는 청원 서명 PII에 접근 불가. service_role(server-side admin client)만 호출 가능.
REVOKE EXECUTE ON FUNCTION public.get_petition_region_breakdown(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_petition_region_breakdown(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_petition_region_breakdown(text) TO service_role;
