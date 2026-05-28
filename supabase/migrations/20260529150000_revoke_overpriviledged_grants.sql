-- Migration: 과도한 GRANT 회수 — authenticated 일반 사용자에게 열린 DML 권한 축소.
--
-- 배경: 초기 migrations에서 service_role + authenticated 양쪽에 GRANT ALL을 발급하면서
-- 일반 사용자가 RLS 정책 외에 테이블 수준 권한을 가진 상태. RLS가 차단해도 최소 권한 원칙
-- 위반이고, 향후 RLS 정책 실수 시 곧장 데이터 노출/변조로 이어진다.
--
-- 1) artwork_sales (20260215060000_grant_artwork_sales_service_role.sql L5):
--    `GRANT ALL ... TO authenticated`가 INSERT/UPDATE/DELETE를 일반 사용자에게 열어둠.
--    artwork_sales는 service_role + admin policy로만 쓰여야 함. SELECT는 RLS 정책 관리.
-- 2) activity_logs (20260212023000_add_activity_logs.sql L52):
--    `GRANT UPDATE` 권한이 일반 사용자에게 있음. 감사 로그는 불변 원칙. admin revert/purge는
--    service_role 또는 RLS 정책 경로(admins_can_update_activity_logs)로 처리하면 충분.
-- 3) artist_applications / exhibitor_applications:
--    `GRANT ALL`이 DELETE 권한을 일반 사용자에게 열어둠. 신청서는 동의 이력 보존 대상이라
--    DELETE는 service_role 또는 admin 서버 액션으로만.

REVOKE INSERT, UPDATE, DELETE ON public.artwork_sales FROM authenticated;
REVOKE UPDATE ON public.activity_logs FROM authenticated;
REVOKE DELETE ON public.artist_applications FROM authenticated;
REVOKE DELETE ON public.exhibitor_applications FROM authenticated;
