-- Remove an unused PL/pgSQL variable flagged by `supabase db lint`.
-- The dispatcher only needs to invoke close_petition and count attempted due petitions.

CREATE OR REPLACE FUNCTION public.close_petitions_due()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug  text;
  v_count integer := 0;
BEGIN
  -- service_role 가드: cron job은 superuser로 실행되므로 별도 검사 불필요.
  -- 하지만 외부 호출 차단 위해 super check.
  IF current_setting('request.jwt.claim.role', true) IS NOT NULL
     AND current_setting('request.jwt.claim.role', true) NOT IN ('service_role') THEN
    RAISE EXCEPTION 'AUTO_CLOSE_FORBIDDEN';
  END IF;

  FOR v_slug IN
    SELECT slug FROM public.petitions
    WHERE is_active = true AND deadline_at <= now()
  LOOP
    PERFORM public.close_petition(v_slug);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'closed', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.close_petitions_due() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.close_petitions_due() TO service_role;
