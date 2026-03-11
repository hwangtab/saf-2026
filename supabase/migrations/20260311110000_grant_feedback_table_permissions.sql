-- Grant table-level permissions for feedback table
-- RLS policies exist but table GRANT was missing, causing "permission denied" errors

GRANT SELECT, INSERT ON TABLE public.feedback TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.feedback TO service_role;
