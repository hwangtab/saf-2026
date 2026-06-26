-- log_petition_audit의 role 가드를 auth.role() 기반으로 교정
-- 사유: 기존 본문은 current_setting('request.jwt.claim.role', true)로 role을 읽는데, 라이브
--   PostgREST에서 이 GUC는 NULL이라 `NULL IS DISTINCT FROM 'service_role'`가 항상 TRUE →
--   service_role 키로 호출해도 항상 AUDIT_LOG_FORBIDDEN을 던진다(과거 petition/rate_limit/event
--   RPC에서 3회 재발한 회귀와 동일 원인). 현재 호출처가 없어 휴면 상태이나, 재도입 전 교정.
-- ACL(REVOKE FROM PUBLIC + service_role GRANT)은 이미 올바르므로 본문 검사는 방어적 이중화.
-- search_path·시그니처·ACL은 기존과 동일하게 유지(CREATE OR REPLACE는 ACL 보존).

CREATE OR REPLACE FUNCTION public.log_petition_audit(
  p_slug        text,
  p_action      text,
  p_target_type text,
  p_target_id   uuid,
  p_details     jsonb DEFAULT '{}'::jsonb,
  p_actor_id    uuid DEFAULT NULL,
  p_ip_hash     text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  -- 라이브에서 신뢰 가능한 role 판별은 auth.role()뿐(GUC는 NULL).
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUDIT_LOG_FORBIDDEN';
  END IF;

  INSERT INTO public.petition_audit_log (
    petition_slug, actor_id, action, target_type, target_id, details, ip_hash
  ) VALUES (
    p_slug,
    COALESCE(p_actor_id, auth.uid()),
    p_action,
    p_target_type,
    p_target_id,
    COALESCE(p_details, '{}'::jsonb),
    p_ip_hash
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
