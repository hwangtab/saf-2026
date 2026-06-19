-- Remove automatic petition PII purge.
--
-- Operational policy:
-- - Petition closing may remain automatic.
-- - PII purging must be a deliberate manual/admin operation, not a daily cron.
-- - The public.purge_petitions_expired() function stays available for manual use.
--
-- Supabase/pg_cron note: do not edit cron.job directly; use cron.unschedule().

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron not installed — no petition_auto_purge job to remove.';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'petition_auto_purge';

  RAISE NOTICE 'Removed pg_cron job: petition_auto_purge';
END;
$$;
