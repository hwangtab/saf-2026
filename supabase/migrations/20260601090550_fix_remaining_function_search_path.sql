-- Fix remaining Supabase security advisor function_search_path_mutable warnings.
-- These functions were recreated after the earlier broad search_path migration,
-- so their per-function search_path config was reset to NULL.

ALTER FUNCTION public.get_petition_duplicate_signatures(
  p_slug text,
  p_search text,
  p_limit integer,
  p_offset integer
) SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_web_vitals_summary(
  since_ts timestamp with time zone
) SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_web_vitals_daily_p75(
  since_ts timestamp with time zone
) SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_web_vitals_worst_pages(
  since_ts timestamp with time zone,
  target_metric text,
  lim integer
) SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_web_vitals_regression_count(
  since_ts timestamp with time zone,
  min_sample_size integer
) SET search_path = public, pg_catalog;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public, pg_catalog;
