-- Add unique constraints for idempotency in migration
DO $$ BEGIN
    alter table public.artworks add constraint artworks_artist_id_title_key unique (artist_id, title);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    alter table public.faq add constraint faq_question_key unique (question);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN others THEN NULL;
END $$;

-- Fix reviews permissions once and for all
grant all on table public.reviews to service_role;
grant select on table public.reviews to anon, authenticated;
