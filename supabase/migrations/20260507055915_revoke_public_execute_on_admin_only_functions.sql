-- Revoke EXECUTE on admin-only / internal functions from PUBLIC.
-- Issue (advisor: anon_security_definer_function_executable):
-- 16 SECURITY DEFINER functions had EXECUTE granted to PUBLIC, exposing them via
-- /rest/v1/rpc/<fn> to the anon role. Most concerning: 10 page-view analytics
-- functions (admin-only data) callable by any anonymous client.
--
-- service_role retains access via its own GRANT (separate from PUBLIC).
-- Verification: app/actions/admin-analytics.ts is the only caller,
-- uses requireAdminClient() → service_role → unaffected.

-- 1. Page view analytics (admin dashboard only)
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
