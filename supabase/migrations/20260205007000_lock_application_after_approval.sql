-- Lock artist applications after approval; only pending users can modify their application.

DROP POLICY IF EXISTS "Users manage own application" ON public.artist_applications;
CREATE POLICY "Users manage own application" ON public.artist_applications
  FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.status = 'pending'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.status = 'pending'
    )
  );

NOTIFY pgrst, 'reload';
