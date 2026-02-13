-- Allow service role API keys to read/write activity logs for maintenance jobs.
GRANT SELECT, INSERT, UPDATE ON TABLE public.activity_logs TO service_role;

