ALTER TABLE public.artworks ADD COLUMN category text;

COMMENT ON COLUMN public.artworks.category IS '작품 분류: 회화, 한국화, 판화, 사후판화, 드로잉, 조각, 도자/공예, 사진, 아트프린트, 혼합매체, 디지털아트, 또는 직접입력 값';
