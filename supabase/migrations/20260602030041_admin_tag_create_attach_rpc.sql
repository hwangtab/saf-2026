BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.create_and_attach_admin_tag_to_artwork(
  p_artwork_id uuid,
  p_name text,
  p_slug text,
  p_color text DEFAULT '#6b7280',
  p_description text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS public.admin_tags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tag public.admin_tags%ROWTYPE;
  v_archived_tag_id uuid;
BEGIN
  SELECT id
  INTO v_archived_tag_id
  FROM public.admin_tags
  WHERE slug = p_slug
    AND archived_at IS NOT NULL
  LIMIT 1;

  IF v_archived_tag_id IS NOT NULL THEN
    RAISE EXCEPTION 'archived_admin_tag_slug_exists'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.admin_tags (
    name,
    slug,
    color,
    description,
    created_by,
    updated_by
  )
  VALUES (
    p_name,
    p_slug,
    p_color,
    p_description,
    p_admin_id,
    p_admin_id
  )
  RETURNING * INTO v_tag;

  INSERT INTO public.artwork_admin_tags (
    artwork_id,
    tag_id,
    created_by
  )
  VALUES (
    p_artwork_id,
    v_tag.id,
    p_admin_id
  );

  RETURN v_tag;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_and_attach_admin_tag_to_artwork(
  uuid,
  text,
  text,
  text,
  text,
  uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_and_attach_admin_tag_to_artwork(
  uuid,
  text,
  text,
  text,
  text,
  uuid
) TO service_role;

COMMIT;
