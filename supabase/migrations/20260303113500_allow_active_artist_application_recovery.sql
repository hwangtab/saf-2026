DROP POLICY IF EXISTS "Users manage own application" ON public.artist_applications;

CREATE POLICY "Users manage own application" ON public.artist_applications
  FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status IN ('pending', 'active')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status IN ('pending', 'active')
    )
  );

NOTIFY pgrst, 'reload';
