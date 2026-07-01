-- supabase/migrations/20260701090000_add_artwork_exhibition.sql
-- 오윤 테라코타 기금마련전: 작품의 전시 귀속 태그.
-- NULL = 상시 판매작, 'oh-yoon-terracotta' = 기금마련전 출품작.
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS exhibition text;

CREATE INDEX IF NOT EXISTS idx_artworks_exhibition
  ON public.artworks (exhibition)
  WHERE exhibition IS NOT NULL;
