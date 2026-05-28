-- Migration: prevent_profile_self_escalation() SECURITY DEFINER 함수에 search_path 잠금.
--
-- 배경: 20260421060319_fix_profiles_privilege_escalation.sql가 profiles.role/status 변경을
-- 차단하는 trigger 함수를 SECURITY DEFINER로 만들었으나 search_path를 명시하지 않았다.
-- 동일 시기 20260511130100_function_search_path.sql가 66개 SECURITY DEFINER 함수에
-- 일괄 잠금을 적용했지만 이 함수가 목록에서 누락됐다.
--
-- 위험: search_path mutable 상태에서 공격자가 자기 schema에 `get_my_role()` 함수를 만든 뒤
-- 세션 search_path를 조작하면 SECURITY DEFINER 함수 내부의 호출이 사칭 함수로 라우팅돼
-- profiles.role 변경 차단이 우회될 수 있다. PostgreSQL Security 권고사항.

ALTER FUNCTION public.prevent_profile_self_escalation()
  SET search_path = public, pg_catalog;
