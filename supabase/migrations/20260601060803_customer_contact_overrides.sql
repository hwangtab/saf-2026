-- Admin-managed contact overrides for merged customer records.
-- Keeps login/profile emails and original sale rows intact while allowing CRM cleanup.

CREATE TABLE IF NOT EXISTS public.customer_contact_overrides (
  customer_key text PRIMARY KEY,
  customer_name text NOT NULL,
  phone text,
  email text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_contact_overrides_customer_name_idx
  ON public.customer_contact_overrides (customer_name);

ALTER TABLE public.customer_contact_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage customer contact overrides"
  ON public.customer_contact_overrides;
CREATE POLICY "Admins can manage customer contact overrides"
  ON public.customer_contact_overrides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_contact_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_contact_overrides TO service_role;

COMMENT ON TABLE public.customer_contact_overrides IS
  'Admin-only contact overrides for customer management records.';
COMMENT ON COLUMN public.customer_contact_overrides.customer_key IS
  'Merged customer key such as profile:<uuid> or buyer:<name>.';
