-- 점유·진행률은 캐시 컬럼이 아니라 파생 SUM(좌석 패턴). 만료 pending은 now() 비교로 자동 제외.

CREATE OR REPLACE FUNCTION public.funding_tier_claimed(p_tier_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT COALESCE(SUM(pi.quantity), 0)::integer
  FROM public.pledge_items pi
  JOIN public.funding_pledges p ON p.id = pi.pledge_id
  WHERE pi.reward_tier_id = p_tier_id
    AND ( p.status = 'paid'
       OR (p.status = 'pending_payment' AND p.hold_expires_at > now()) );
$$;

CREATE OR REPLACE FUNCTION public.funding_project_status(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_proj   public.funding_projects%ROWTYPE;
  v_raised integer;
  v_backers integer;
BEGIN
  SELECT * INTO v_proj FROM public.funding_projects WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  SELECT COALESCE(SUM(total_amount),0)::integer, COUNT(*)::integer
    INTO v_raised, v_backers
  FROM public.funding_pledges
  WHERE project_id = v_proj.id AND status = 'paid';
  RETURN jsonb_build_object(
    'found', true,
    'goal_amount', v_proj.goal_amount,
    'raised_amount', v_raised,
    'backer_count', v_backers,
    'status', v_proj.status,
    'end_at', v_proj.end_at,
    'is_open', v_proj.status = 'active'
      AND (v_proj.end_at IS NULL OR v_proj.end_at > now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.funding_tier_claimed(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.funding_project_status(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.funding_tier_claimed(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.funding_project_status(text) TO service_role;
