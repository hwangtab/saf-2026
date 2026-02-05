-- 1. Default status to pending for strict approval flow
ALTER TABLE public.profiles 
ALTER COLUMN status SET DEFAULT 'pending'::public.user_status;

-- 2. Update handle_new_user to enforce pending status specifically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, status)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    'pending'::public.user_status -- Explicitly set to pending
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update RLS policies to check for status = 'active'
-- Artists table: only active artists can update/insert their own profile
DROP POLICY IF EXISTS "Artists insert own" ON public.artists;
CREATE POLICY "Artists insert own" ON public.artists
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'artist' AND p.status = 'active'
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Artists update own" ON public.artists;
CREATE POLICY "Artists update own" ON public.artists
  FOR UPDATE
  USING (
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'artist' AND p.status = 'active'
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'artist' AND p.status = 'active'
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Artworks table: only active artists can manage their artworks
DROP POLICY IF EXISTS "Artists insert own artworks" ON public.artworks;
CREATE POLICY "Artists insert own artworks" ON public.artworks
  FOR INSERT
  WITH CHECK (
    EXISTS (
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

DROP POLICY IF EXISTS "Artists update own artworks" ON public.artworks;
CREATE POLICY "Artists update own artworks" ON public.artworks
  FOR UPDATE
  USING (
    EXISTS (
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
  )
  WITH CHECK (
    EXISTS (
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

-- 4. Grant explicit table permissions to authenticated users (needed for insert/update)
GRANT ALL ON TABLE public.artists TO authenticated;
GRANT ALL ON TABLE public.artworks TO authenticated;
GRANT ALL ON TABLE public.news TO authenticated;
GRANT ALL ON TABLE public.faq TO authenticated;
GRANT ALL ON TABLE public.testimonials TO authenticated;
GRANT ALL ON TABLE public.videos TO authenticated;

-- 5. Restrict execute_sql to service_role only (remove from authenticated if previously granted)
REVOKE EXECUTE ON FUNCTION public.execute_sql(text) FROM public;
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO service_role;
