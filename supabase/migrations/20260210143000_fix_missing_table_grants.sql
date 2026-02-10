-- Fix table-level permission gaps that can surface as "permission denied for table"
-- even when RLS policies are correctly configured.

-- Admin/user profile updates rely on RLS; authenticated needs table write privilege.
GRANT ALL ON TABLE public.profiles TO authenticated;

-- Admin logs only support select/insert by policy; grant matching table privileges.
GRANT SELECT, INSERT ON TABLE public.admin_logs TO authenticated;

NOTIFY pgrst, 'reload';
