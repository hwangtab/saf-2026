-- Align signup metadata keys across providers and backfill missing names.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'full_name', ''),
      NULLIF(new.raw_user_meta_data->>'name', ''),
      NULLIF(new.raw_user_meta_data->>'preferred_username', ''),
      NULLIF(new.raw_user_meta_data->>'user_name', ''),
      NULLIF(new.raw_user_meta_data->>'nickname', '')
    ),
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'avatar_url', ''),
      NULLIF(new.raw_user_meta_data->>'picture', '')
    ),
    'pending'::public.user_status
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE public.profiles p
SET name = COALESCE(
  NULLIF(u.raw_user_meta_data->>'full_name', ''),
  NULLIF(u.raw_user_meta_data->>'name', ''),
  NULLIF(u.raw_user_meta_data->>'preferred_username', ''),
  NULLIF(u.raw_user_meta_data->>'user_name', ''),
  NULLIF(u.raw_user_meta_data->>'nickname', '')
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.name IS NULL OR p.name = '');
