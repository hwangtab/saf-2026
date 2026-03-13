-- 과세구분 컬럼 추가 (Cafe24 API tax_type: A=과세, B=면세, C=영세)
-- 예술 원작은 면세이므로 기본값 'B'
ALTER TABLE public.artworks
  ADD COLUMN tax_type text NOT NULL DEFAULT 'B'
  CHECK (tax_type IN ('A', 'B', 'C'));

COMMENT ON COLUMN public.artworks.tax_type IS '과세구분: A=과세, B=면세, C=영세';
