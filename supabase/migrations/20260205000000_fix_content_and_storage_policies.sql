-- 1. Hardening Admin Content Tables (News, FAQ, Testimonials, Videos)
-- Remove the generic "authenticated users can do everything" permissions if implicit,
-- and ensure strictly Admin-only write policies.

-- News
DROP POLICY IF EXISTS "Admins manage all news" ON public.news;
CREATE POLICY "Admins manage all news" ON public.news
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- FAQ
DROP POLICY IF EXISTS "Admins manage all faq" ON public.faq;
CREATE POLICY "Admins manage all faq" ON public.faq
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Testimonials
DROP POLICY IF EXISTS "Admins manage all testimonials" ON public.testimonials;
CREATE POLICY "Admins manage all testimonials" ON public.testimonials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Videos
DROP POLICY IF EXISTS "Admins manage all videos" ON public.videos;
CREATE POLICY "Admins manage all videos" ON public.videos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Hardening Delete Policies for Artists
-- Ensure only ACTIVE artists can delete their own records.

-- Artists
DROP POLICY IF EXISTS "Artists delete own" ON public.artists;
CREATE POLICY "Artists delete own" ON public.artists
  FOR DELETE
  USING (
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'artist' AND p.status = 'active'
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Artworks
DROP POLICY IF EXISTS "Artists delete own artworks" ON public.artworks;
CREATE POLICY "Artists delete own artworks" ON public.artworks
  FOR DELETE
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
  );

-- 3. Hardening Storage Policies
-- Ensure only ACTIVE artists can upload/update/delete storage objects.

-- Artworks Bucket - Insert
DROP POLICY IF EXISTS "Artists insert artwork objects" ON storage.objects;
CREATE POLICY "Artists insert artwork objects" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'artworks' AND (
      EXISTS (
        SELECT 1
        FROM public.artists a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.id::text = (storage.foldername(name))[1]
          AND p.id = auth.uid()
          AND p.role = 'artist'
          AND p.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- Artworks Bucket - Update
DROP POLICY IF EXISTS "Artists update artwork objects" ON storage.objects;
CREATE POLICY "Artists update artwork objects" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'artworks' AND (
      EXISTS (
        SELECT 1
        FROM public.artists a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.id::text = (storage.foldername(name))[1]
          AND p.id = auth.uid()
          AND p.role = 'artist'
          AND p.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- Artworks Bucket - Delete
DROP POLICY IF EXISTS "Artists delete artwork objects" ON storage.objects;
CREATE POLICY "Artists delete artwork objects" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'artworks' AND (
      EXISTS (
        SELECT 1
        FROM public.artists a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.id::text = (storage.foldername(name))[1]
          AND p.id = auth.uid()
          AND p.role = 'artist'
          AND p.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- Profiles Bucket is less critical as user_id = auth.uid() is the main check, 
-- but ideally we also want active only? 
-- Actually profiles should be updatable even if pending? 
-- Requirement said "New sign-ups default to pending. Only active users can perform write operations."
-- If they can't upload profile image, they can't complete profile to request approval? 
-- Usually allow profile edits while pending. So leaving Profiles bucket as is (owner only) is acceptable.
-- BUT user specifically flagged P1 "suspended artists can... delete/upload".
-- Suspended users should NOT be able to do anything.
-- So let's check status != 'suspended' for profiles bucket.

DROP POLICY IF EXISTS "Users insert profile objects" ON storage.objects;
CREATE POLICY "Users insert profile objects" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profiles' AND (
      ((storage.foldername(name))[1] = auth.uid()::text AND EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status != 'suspended'
      ))
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Users update profile objects" ON storage.objects;
CREATE POLICY "Users update profile objects" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profiles' AND (
      ((storage.foldername(name))[1] = auth.uid()::text AND EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status != 'suspended'
      ))
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Users delete profile objects" ON storage.objects;
CREATE POLICY "Users delete profile objects" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profiles' AND (
      ((storage.foldername(name))[1] = auth.uid()::text AND EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status != 'suspended'
      ))
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- Reload cache
NOTIFY pgrst, 'reload';
