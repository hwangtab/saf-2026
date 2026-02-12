ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS sold_at timestamptz;

UPDATE public.artworks
SET sold_at = COALESCE(updated_at, created_at)
WHERE status = 'sold' AND sold_at IS NULL;

CREATE INDEX IF NOT EXISTS artworks_sold_at_idx ON public.artworks (sold_at);
