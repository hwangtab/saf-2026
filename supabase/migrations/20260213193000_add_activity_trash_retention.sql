-- Add trash retention / purge metadata to activity logs
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS trash_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS purged_at timestamptz,
  ADD COLUMN IF NOT EXISTS purged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purge_note text;

CREATE INDEX IF NOT EXISTS idx_activity_logs_trash_state
  ON public.activity_logs (purged_at, reverted_at, trash_expires_at DESC);

-- Ensure admin users can update log rows for revert/purge operations when service-role key is not used.
DROP POLICY IF EXISTS "admins_can_update_activity_logs" ON public.activity_logs;
CREATE POLICY "admins_can_update_activity_logs" ON public.activity_logs
  FOR UPDATE USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Backfill trash expiration for existing deletion logs with rollback snapshots.
UPDATE public.activity_logs
SET trash_expires_at = created_at + interval '30 days'
WHERE action IN ('artwork_deleted', 'artist_deleted', 'artist_artwork_deleted', 'batch_artwork_deleted')
  AND before_snapshot IS NOT NULL
  AND after_snapshot IS NULL
  AND trash_expires_at IS NULL;

