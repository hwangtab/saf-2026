-- service_role 및 authenticated에 email 테이블 DML 권한 부여.
-- 기존 마이그레이션이 anon/authenticated SELECT만 부여했고
-- service_role에 권한이 없어 모든 서버 사이드 DML이 403으로 실패했음.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_broadcasts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_broadcast_recipients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppressions TO service_role;

-- authenticated도 DML 허용 (RLS가 실제 접근 제어 담당)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_broadcast_recipients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppressions TO authenticated;
