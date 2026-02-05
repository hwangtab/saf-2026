-- Allow active artists to view their own artworks even if hidden, and block suspended users from editing applications.

-- Artworks select policy: public sees only non-hidden, owner/admin can see all
DROP POLICY IF EXISTS "Public viewable artworks" ON public.artworks;
CREATE POLICY "Public viewable artworks" ON public.artworks
  FOR SELECT
  USING (
    NOT is_hidden
    OR EXISTS (
      SELECT 1
      FROM public.artists a
      JOIN public.profiles p ON p.id = a.user_id
      WHERE a.id = artworks.artist_id
        AND p.id = auth.uid()
        AND p.role = 'artist'
        AND p.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Artist applications: block suspended users
DROP POLICY IF EXISTS "Users manage own application" ON public.artist_applications;
CREATE POLICY "Users manage own application" ON public.artist_applications
  FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.status != 'suspended'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.status != 'suspended'
    )
  );

-- Reload cache
NOTIFY pgrst, 'reload';
