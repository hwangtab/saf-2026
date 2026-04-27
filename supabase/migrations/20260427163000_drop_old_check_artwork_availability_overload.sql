-- Migration: 1-arg check_artwork_availability(uuid) 제거하여 ambiguity 해소
--
-- 배경: 20260427160000에서 2-arg 시그니처(p_artwork_id, p_exclude_order_id DEFAULT NULL)를
-- 추가했으나 기존 1-arg 시그니처가 그대로 남아 PostgreSQL function overload 상태가 됨.
-- Supabase-js가 1-arg로 호출하면 "function ... is not unique" 에러로 createOrder 차단.
--
-- 수정: 1-arg 버전을 명시적으로 DROP. 2-arg 버전은 p_exclude_order_id가 DEFAULT NULL이므로
-- 1-arg 호출 그대로 동작하며, 더 이상 ambiguity가 발생하지 않음.

DROP FUNCTION IF EXISTS public.check_artwork_availability(p_artwork_id uuid);
