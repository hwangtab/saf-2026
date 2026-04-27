-- service_role에 stories 테이블 SELECT 권한 부여
-- supabase JS client의 .upsert().select() 호출에 SELECT 권한 필요.
GRANT SELECT ON stories TO service_role;
