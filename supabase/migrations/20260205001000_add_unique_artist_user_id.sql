-- Dedupe artists per user_id while preserving artworks
DO $$ BEGIN
    -- Reassign artworks to the most recent artist row per user_id
    WITH ranked AS (
        SELECT
            id,
            user_id,
            ROW_NUMBER() OVER (
                PARTITION BY user_id
                ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
            ) AS rn,
            FIRST_VALUE(id) OVER (
                PARTITION BY user_id
                ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
            ) AS keep_id
        FROM public.artists
        WHERE user_id IS NOT NULL
    ),
    dedupes AS (
        SELECT id, keep_id
        FROM ranked
        WHERE rn > 1
    )
    UPDATE public.artworks a
    SET artist_id = d.keep_id
    FROM dedupes d
    WHERE a.artist_id = d.id;

    -- Delete duplicate artist rows (keep the most recent)
    WITH ranked AS (
        SELECT
            id,
            user_id,
            ROW_NUMBER() OVER (
                PARTITION BY user_id
                ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
            ) AS rn
        FROM public.artists
        WHERE user_id IS NOT NULL
    )
    DELETE FROM public.artists a
    USING ranked r
    WHERE a.id = r.id AND r.rn > 1;
END $$;

-- Add uniqueness constraint (idempotent)
DO $$ BEGIN
    ALTER TABLE public.artists
    ADD CONSTRAINT artists_user_id_key UNIQUE (user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
