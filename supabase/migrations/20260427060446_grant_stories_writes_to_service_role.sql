-- service_role에 stories 테이블 INSERT/UPDATE/DELETE 권한 부여
-- 다른 테이블(artwork_sales, activity_logs, application_tables)에는 이미 부여되어 있는데
-- stories만 누락되어 있어 매거진 발행 스크립트가 permission denied로 실패했음.
GRANT INSERT, UPDATE, DELETE ON stories TO service_role;
