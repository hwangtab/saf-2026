ALTER TABLE public.artwork_sales
  ADD COLUMN IF NOT EXISTS buyer_phone text;

COMMENT ON COLUMN public.artwork_sales.buyer_phone
  IS '구매자 연락처 (수동 입력, 관리자 전용)';
