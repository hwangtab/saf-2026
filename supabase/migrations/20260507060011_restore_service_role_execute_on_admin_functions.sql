-- Hotfix: previous REVOKE FROM PUBLIC also removed implicit service_role access.
-- Restore explicit GRANT to service_role for admin-internal functions.
--
-- Why this is needed: in PostgreSQL, REVOKE ... FROM PUBLIC strips the implicit
-- grant that all roles inherit, including service_role. To keep backend admin
-- code (admin-analytics.ts via requireAdminClient) working, we must explicitly
-- grant EXECUTE back to service_role for the functions it actually calls.
--
-- Trigger functions (audit_petition_message_mask, enforce_artist_notice_admin_only,
-- fill_petition_mask_metadata, handle_new_user) intentionally NOT included here:
-- they execute as the table owner role (postgres) at trigger time, so no direct
-- RPC caller exists. Leaving them locked down.

-- Page view analytics (used by admin-analytics.ts via requireAdminClient)
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

-- Hash functions (may be called by admin tools or backend jobs)
GRANT EXECUTE ON FUNCTION public.hash_email(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.hash_ip(text, text) TO service_role;
