BEGIN;
SET LOCAL lock_timeout = '5s';
-- artworks 테이블: tone 추가 (매뉴얼 7.4 "비슷한 톤" 비슷한 작품 랭킹용)
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS tone text[];
COMMENT ON COLUMN public.artworks.tone IS '작품 톤/무드 태그 (복수, 비슷한 작품 랭킹용 — 매뉴얼 7.4)';
COMMIT;
