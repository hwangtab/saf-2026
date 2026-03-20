BEGIN;

SET LOCAL lock_timeout = '5s';

-- artists 테이블: bio_en, history_en 추가 (name_en은 이미 존재)
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS bio_en text,
  ADD COLUMN IF NOT EXISTS history_en text;

COMMENT ON COLUMN public.artists.bio_en IS '작가 소개 영문';
COMMENT ON COLUMN public.artists.history_en IS '작가 이력 영문';

-- artworks 테이블: title_en, description_en 추가
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS description_en text;

COMMENT ON COLUMN public.artworks.title_en IS '작품명 영문';
COMMENT ON COLUMN public.artworks.description_en IS '작품 설명 영문';

COMMIT;
