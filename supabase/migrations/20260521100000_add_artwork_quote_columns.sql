BEGIN;

SET LOCAL lock_timeout = '5s';

-- artworks 테이블: quote, quote_en 추가 (매뉴얼 Part 7 [7] 작가 인용 섹션)
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS quote text,
  ADD COLUMN IF NOT EXISTS quote_en text;

COMMENT ON COLUMN public.artworks.quote IS '작가 인용 (1~2줄 한 마디, 작가 본인 표현)';
COMMENT ON COLUMN public.artworks.quote_en IS '작가 인용 영문';

COMMIT;
