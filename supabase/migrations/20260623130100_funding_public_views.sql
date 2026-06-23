-- 공개 후원자 명단: paid만, 익명 마스킹, PII(email/phone/shipping/ip) 비노출.
CREATE OR REPLACE FUNCTION public.funding_public_backers(p_slug text, p_limit integer DEFAULT 100)
RETURNS TABLE(display_name text, amount integer, message text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    CASE WHEN fp.is_anonymous THEN '익명' ELSE fp.backer_name END,
    fp.total_amount,
    CASE WHEN fp.message_public THEN fp.supporter_message ELSE NULL END,
    fp.paid_at
  FROM public.funding_pledges fp
  JOIN public.funding_projects p ON p.id = fp.project_id
  WHERE p.slug = p_slug AND fp.status = 'paid'
  ORDER BY fp.paid_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
$$;

-- 티어별 잔여 수량(한정 티어만; 무제한은 null)
CREATE OR REPLACE FUNCTION public.funding_tier_remaining(p_slug text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT COALESCE(jsonb_object_agg(rt.id::text,
    CASE WHEN rt.total_quantity IS NULL THEN NULL
         ELSE GREATEST(rt.total_quantity - public.funding_tier_claimed(rt.id), 0) END), '{}'::jsonb)
  FROM public.reward_tiers rt
  JOIN public.funding_projects p ON p.id = rt.project_id
  WHERE p.slug = p_slug;
$$;

REVOKE ALL ON FUNCTION public.funding_public_backers(text, integer) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.funding_tier_remaining(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.funding_public_backers(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.funding_tier_remaining(text) TO service_role;
