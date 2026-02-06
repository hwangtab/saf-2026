-- Create helper functions with SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_status()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid();
$$;

-- Fix Profiles policies
DROP POLICY IF EXISTS "Profiles select own or admin" ON public.profiles;
CREATE POLICY "Profiles select own or admin" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "Profiles update own or admin" ON public.profiles;
CREATE POLICY "Profiles update own or admin" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
  )
  WITH CHECK (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
  );

-- Fix Artists policies
DROP POLICY IF EXISTS "Artists insert own" ON public.artists;
CREATE POLICY "Artists insert own" ON public.artists
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND public.get_my_role() = 'artist')
    OR public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "Artists update own" ON public.artists;
CREATE POLICY "Artists update own" ON public.artists
  FOR UPDATE
  USING (
    (user_id = auth.uid() AND public.get_my_role() = 'artist')
    OR public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "Artists delete own" ON public.artists;
CREATE POLICY "Artists delete own" ON public.artists
  FOR DELETE
  USING (
    (user_id = auth.uid() AND public.get_my_role() = 'artist')
    OR public.get_my_role() = 'admin'
  );

-- Fix Artworks select policy (most important for public view)
-- The "Public viewable artworks" policy was causing recursion because it joined artists and profiles
DROP POLICY IF EXISTS "Public viewable artworks" ON public.artworks;
CREATE POLICY "Public viewable artworks" ON public.artworks
  FOR SELECT
  USING (
    NOT is_hidden
    OR (
      EXISTS (
        SELECT 1
        FROM public.artists a
        WHERE a.id = artworks.artist_id
          AND a.user_id = auth.uid()
      )
      AND public.get_my_role() = 'artist'
      AND public.get_my_status() = 'active'
    )
    OR public.get_my_role() = 'admin'
  );

-- Fix Artworks insert/update/delete policies
DROP POLICY IF EXISTS "Artists insert own artworks" ON public.artworks;
CREATE POLICY "Artists insert own artworks" ON public.artworks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.artists a
      WHERE a.id = artworks.artist_id
        AND a.user_id = auth.uid()
        AND public.get_my_role() = 'artist'
    )
    OR public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "Artists update own artworks" ON public.artworks;
CREATE POLICY "Artists update own artworks" ON public.artworks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.artists a
      WHERE a.id = artworks.artist_id
        AND a.user_id = auth.uid()
        AND public.get_my_role() = 'artist'
    )
    OR public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "Artists delete own artworks" ON public.artworks;
CREATE POLICY "Artists delete own artworks" ON public.artworks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.artists a
      WHERE a.id = artworks.artist_id
        AND a.user_id = auth.uid()
        AND public.get_my_role() = 'artist'
    )
    OR public.get_my_role() = 'admin'
  );

-- Reload schema cache
NOTIFY pgrst, 'reload';
