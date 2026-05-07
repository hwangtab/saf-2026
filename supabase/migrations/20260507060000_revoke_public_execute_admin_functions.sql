-- Revoke EXECUTE on admin-only / internal functions from PUBLIC + restore service_role.
--
-- Issue (advisor: anon_security_definer_function_executable):
-- 16 SECURITY DEFINER functions had EXECUTE granted to PUBLIC, exposing them via
-- /rest/v1/rpc/<fn> to the anon role. Most concerning: 10 page-view analytics
-- functions (admin-only data) callable by any anonymous client.
--
-- Verification before applying:
-- - Only caller of get_pv_* is app/actions/admin-analytics.ts via requireAdminClient
--   (service_role) → unaffected by REVOKE FROM PUBLIC.
-- - hash_email/hash_ip have no client-side callers; CPU-burn protection.
-- - Trigger functions are invoked by table owner (postgres) at trigger time,
--   not by direct RPC calls.
--
-- Note: REVOKE FROM PUBLIC also strips the implicit grant that service_role
-- inherits, so we explicitly GRANT EXECUTE TO service_role for functions that
-- the backend actually calls.

-- 1. Page view analytics functions (admin dashboard)
REVOKE EXECUTE ON FUNCTION public.get_pv_summary(timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pv_top_pages(timestamp with time zone, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pv_top_referrers(timestamp with time zone, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pv_daily_trend(timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pv_device_distribution(timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pv_country_distribution(timestamp with time zone, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pv_browser_distribution(timestamp with time zone, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pv_os_distribution(timestamp with time zone, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pv_hourly_distribution(timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pv_realtime_visitors(integer) FROM PUBLIC;

-- 2. Hash functions (CPU-burn protection)
REVOKE EXECUTE ON FUNCTION public.hash_email(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hash_ip(text, text) FROM PUBLIC;

-- 3. Trigger functions (direct call has no useful effect; tighten anyway)
REVOKE EXECUTE ON FUNCTION public.audit_petition_message_mask() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_artist_notice_admin_only() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fill_petition_mask_metadata() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 4. Restore service_role grants (REVOKE FROM PUBLIC removed implicit grant)
GRANT EXECUTE ON FUNCTION public.get_pv_summary(timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pv_top_pages(timestamp with time zone, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pv_top_referrers(timestamp with time zone, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pv_daily_trend(timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pv_device_distribution(timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pv_country_distribution(timestamp with time zone, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pv_browser_distribution(timestamp with time zone, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pv_os_distribution(timestamp with time zone, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pv_hourly_distribution(timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pv_realtime_visitors(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.hash_email(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.hash_ip(text, text) TO service_role;
-- Trigger functions intentionally not granted to service_role: they execute as
-- postgres role (table owner) at trigger time, no direct callers exist.
