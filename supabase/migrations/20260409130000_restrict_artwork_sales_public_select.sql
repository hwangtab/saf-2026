-- artwork_sales 테이블의 공개 SELECT 정책 제거
-- buyer_name, buyer_phone 등 PII가 익명 API로 노출되는 것을 방지
-- 모든 artwork_sales 쿼리는 서버 측(service_role/admin)에서만 수행됨

DROP POLICY IF EXISTS "Public can view sales" ON public.artwork_sales;
DROP POLICY IF EXISTS "Public can view sales (no buyer info)" ON public.artwork_sales;
