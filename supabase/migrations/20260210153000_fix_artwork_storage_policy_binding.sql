-- Fix ambiguous name binding in storage artwork policies.
-- Use storage.objects.name explicitly so folder checks evaluate object path,
-- not joined profile columns inside EXISTS subqueries.

DROP POLICY IF EXISTS "Artists insert artwork objects" ON storage.objects;
CREATE POLICY "Artists insert artwork objects" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'artworks' AND (
      EXISTS (
        SELECT 1
        FROM public.artists a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.id::text = (storage.foldername(storage.objects.name))[1]
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

DROP POLICY IF EXISTS "Artists update artwork objects" ON storage.objects;
CREATE POLICY "Artists update artwork objects" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'artworks' AND (
      EXISTS (
        SELECT 1
        FROM public.artists a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.id::text = (storage.foldername(storage.objects.name))[1]
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

DROP POLICY IF EXISTS "Artists delete artwork objects" ON storage.objects;
CREATE POLICY "Artists delete artwork objects" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'artworks' AND (
      EXISTS (
        SELECT 1
        FROM public.artists a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.id::text = (storage.foldername(storage.objects.name))[1]
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

NOTIFY pgrst, 'reload';
