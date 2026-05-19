-- CLS worst targets RPC
-- page_views.event_data에 저장된 web-vitals attribution의 largestShiftTarget selector를
-- page_path x shift_target 조합으로 집계해 CLS worst offender 식별에 사용.
-- WebVitalsTracker.tsx가 debug_target(=largestShiftTarget, 100자 truncate)을 event_data에 적재.
CREATE OR REPLACE FUNCTION public.get_web_vitals_worst_cls_targets(
  days_back integer DEFAULT 7,
  min_samples integer DEFAULT 3,
  lim integer DEFAULT 20
)
RETURNS TABLE (
  page_path text,
  shift_target text,
  samples bigint,
  p75 numeric,
  poor_rate numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(event_data->>'page_path', '(unknown)') AS page_path,
    COALESCE(NULLIF(event_data->>'debug_target', ''), '(none)') AS shift_target,
    COUNT(*) AS samples,
    percentile_cont(0.75) WITHIN GROUP (
      ORDER BY (event_data->>'metric_value')::numeric
    ) AS p75,
    AVG(CASE WHEN event_data->>'metric_rating' = 'poor' THEN 1 ELSE 0 END)::numeric AS poor_rate
  FROM public.page_views
  WHERE event_name = 'web_vitals'
    AND event_data->>'metric_name' = 'CLS'
    AND created_at > now() - (days_back || ' days')::interval
  GROUP BY 1, 2
  HAVING COUNT(*) >= min_samples
  ORDER BY p75 DESC, samples DESC
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION public.get_web_vitals_worst_cls_targets(integer, integer, integer) TO authenticated;
