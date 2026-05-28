-- 루트 원인: public 스키마 default privileges가 postgres 생성 테이블에
-- anon/authenticated SELECT만 부여하고 service_role에는 아무 권한도 주지 않음
-- (pg_default_acl: {anon=r/postgres, authenticated=r/postgres}). 그 결과 마이그레이션으로
-- 만든 모든 테이블에서 service_role(admin client) DML이 42501(permission denied)로 실패.
-- email 테이블은 20260529110000에서 개별 복구했으나 admin_logs/petitions 등 동일 증상 잔존.

-- 1) 기존 모든 public 테이블·시퀀스에 service_role 전체 권한 복구
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 2) 향후 postgres가 생성할 테이블·시퀀스에 자동 부여 (재발 영구 차단)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
