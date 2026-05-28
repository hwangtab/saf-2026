-- Migration: admin_logs 테이블에 service_role GRANT 추가.
--
-- 배경: 20260206020000_add_admin_logs.sql은 admin_logs 테이블 생성 + admin 사용자 RLS만
-- 설정하고 service_role에 대한 명시적 GRANT를 발급하지 않았다. 같은 시기 다른 테이블
-- (activity_logs, cafe24_tokens 등)은 service_role grant를 명시. 일관성·운영 안정성 확보.
--
-- 영향: server actions가 service_role로 admin_logs에 INSERT하는 경로(특히 분석/cron)에서
-- permission denied가 발생할 수 있는 잠재 사고를 사전 차단.

GRANT SELECT, INSERT ON public.admin_logs TO service_role;
