-- Function search_path 명시.
--
-- Supabase security advisor `function_search_path_mutable` 54건 해소.
-- search_path가 mutable이면 caller가 임시 schema에 동명 객체를 만들어 호출되는
-- 함수 안의 unqualified reference를 가로채는 권한 escalation 시나리오가 가능.
-- 모든 함수가 public schema만 참조하므로 `public, pg_catalog`로 고정.
--
-- ALTER FUNCTION은 함수 시그니처 정확해야 — pg_get_function_identity_arguments()로
-- production에서 직접 추출한 시그니처 사용.

ALTER FUNCTION public.check_artwork_availability(p_artwork_id uuid, p_exclude_order_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.execute_sql(sql text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.extract_query_param(qs text, key text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.fill_petition_mask_metadata() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_artist_commerce_dashboard(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_commerce_funnel_summary(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_cross_link_summary(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_gsc_daily_trend(since_date date) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_gsc_low_ctr_queries(since_date date, min_impressions integer, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_gsc_sync_status() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_gsc_top_pages(since_date date, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_gsc_top_queries(since_date date, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_locale_switch_pages(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_locale_switch_summary(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_member_join_click_daily(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_member_join_click_position_distribution(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_member_join_click_summary(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_purchase_click_summary(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_browser_distribution(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_country_distribution(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_daily_trend(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_device_distribution(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_hourly_distribution(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_os_distribution(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_realtime_visitors(minutes integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_session_depth(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_summary(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_top_exit_pages(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_top_pages(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_top_referrers(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_utm_distribution(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_pv_visitor_recurrence(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_revenue_daily_trend(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_share_click_channel_distribution(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_share_click_summary(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_story_attributed_revenue(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_story_to_artwork_position_distribution(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_story_to_artwork_source_distribution(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_top_artwork_funnel(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_top_artwork_to_story_artworks(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_top_clicked_artworks_from_stories(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_top_converting_stories(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_top_purchase_clicked_artworks(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_top_shared_pages(since_ts timestamp with time zone, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_web_vitals_daily_p75(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_web_vitals_summary(since_ts timestamp with time zone) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_web_vitals_worst_pages(since_ts timestamp with time zone, target_metric text, lim integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_paid_status(s text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_test_buyer_email(email text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.parse_artwork_price(price_text text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_artwork_sold_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_artwork_status_on_sale() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_orders_updated_at() SET search_path = public, pg_catalog;
