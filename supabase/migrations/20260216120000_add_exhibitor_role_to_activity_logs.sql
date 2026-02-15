-- Add 'exhibitor' to the actor_role check constraint
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_actor_role_check;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_actor_role_check
  CHECK (actor_role IN ('admin', 'artist', 'system', 'exhibitor'));

-- Add RLS policy for exhibitors to insert their own logs
DROP POLICY IF EXISTS "exhibitors_can_insert_own_activity_logs" ON public.activity_logs;
CREATE POLICY "exhibitors_can_insert_own_activity_logs" ON public.activity_logs
  FOR INSERT WITH CHECK (
    get_my_role() = 'exhibitor'
    AND actor_role = 'exhibitor'
    AND actor_id = auth.uid()
  );
