-- supabase/migrations/20260528140000_email_broadcasts_fk_fix.sql
-- email_broadcasts.created_by FK: RESTRICT → SET NULL
-- (관리자 계정 삭제 시 broadcast 삭제 블로킹 방지)
ALTER TABLE public.email_broadcasts
  DROP CONSTRAINT IF EXISTS email_broadcasts_created_by_fkey;

ALTER TABLE public.email_broadcasts
  ADD CONSTRAINT email_broadcasts_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;
