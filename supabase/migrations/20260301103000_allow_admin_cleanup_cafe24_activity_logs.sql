GRANT DELETE ON TABLE public.activity_logs TO authenticated;
GRANT DELETE ON TABLE public.activity_logs TO service_role;

DROP POLICY IF EXISTS "admins_can_delete_cafe24_system_activity_logs" ON public.activity_logs;
CREATE POLICY "admins_can_delete_cafe24_system_activity_logs" ON public.activity_logs
  FOR DELETE USING (
    get_my_role() = 'admin'
    AND actor_role = 'system'
    AND action IN ('cafe24_sales_sync_warning', 'cafe24_sales_sync_failed')
  );
