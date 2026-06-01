BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.admin_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_tags_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT admin_tags_slug_not_blank CHECK (btrim(slug) <> ''),
  CONSTRAINT admin_tags_color_hex CHECK (color ~ '^#[0-9a-f]{6}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_tags_slug_key ON public.admin_tags (slug);
CREATE INDEX IF NOT EXISTS admin_tags_active_name_idx
  ON public.admin_tags (lower(name))
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.artwork_admin_tags (
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.admin_tags(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (artwork_id, tag_id)
);

CREATE INDEX IF NOT EXISTS artwork_admin_tags_tag_id_idx
  ON public.artwork_admin_tags (tag_id);
CREATE INDEX IF NOT EXISTS artwork_admin_tags_artwork_id_idx
  ON public.artwork_admin_tags (artwork_id);

COMMENT ON TABLE public.admin_tags IS '관리자 전용 작품 운영 태그 사전';
COMMENT ON TABLE public.artwork_admin_tags IS '작품과 관리자 전용 운영 태그 연결';
COMMENT ON COLUMN public.admin_tags.archived_at IS '태그 보관 처리 시각. 기존 작품 연결은 유지하고 신규 선택 후보에서 제외한다.';

DROP TRIGGER IF EXISTS trg_admin_tags_updated_at ON public.admin_tags;
CREATE TRIGGER trg_admin_tags_updated_at
  BEFORE UPDATE ON public.admin_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admin_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork_admin_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read admin tags" ON public.admin_tags;
DROP POLICY IF EXISTS "Admins can insert admin tags" ON public.admin_tags;
DROP POLICY IF EXISTS "Admins can update admin tags" ON public.admin_tags;
DROP POLICY IF EXISTS "Admins can delete admin tags" ON public.admin_tags;

CREATE POLICY "Admins can read admin tags" ON public.admin_tags
  FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin'::text);

CREATE POLICY "Admins can insert admin tags" ON public.admin_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin'::text);

CREATE POLICY "Admins can update admin tags" ON public.admin_tags
  FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin'::text)
  WITH CHECK (get_my_role() = 'admin'::text);

CREATE POLICY "Admins can delete admin tags" ON public.admin_tags
  FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin'::text);

DROP POLICY IF EXISTS "Admins can read artwork admin tags" ON public.artwork_admin_tags;
DROP POLICY IF EXISTS "Admins can insert artwork admin tags" ON public.artwork_admin_tags;
DROP POLICY IF EXISTS "Admins can update artwork admin tags" ON public.artwork_admin_tags;
DROP POLICY IF EXISTS "Admins can delete artwork admin tags" ON public.artwork_admin_tags;

CREATE POLICY "Admins can read artwork admin tags" ON public.artwork_admin_tags
  FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin'::text);

CREATE POLICY "Admins can insert artwork admin tags" ON public.artwork_admin_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin'::text);

CREATE POLICY "Admins can update artwork admin tags" ON public.artwork_admin_tags
  FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin'::text)
  WITH CHECK (get_my_role() = 'admin'::text);

CREATE POLICY "Admins can delete artwork admin tags" ON public.artwork_admin_tags
  FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin'::text);

REVOKE ALL ON TABLE public.admin_tags FROM anon, public;
REVOKE ALL ON TABLE public.artwork_admin_tags FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.artwork_admin_tags TO authenticated;
GRANT ALL ON TABLE public.admin_tags TO service_role;
GRANT ALL ON TABLE public.artwork_admin_tags TO service_role;

COMMIT;
