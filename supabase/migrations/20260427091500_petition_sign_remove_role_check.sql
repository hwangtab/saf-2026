-- ============================================================
-- Migration: sign_petition의 v_role 검사 제거
--
-- 배경: SECURITY DEFINER 함수 안에서 current_setting('request.jwt.claim.role', true)가
-- 라이브 PostgREST 환경에서 NULL 반환 → service_role JWT인데도 PETITION_SIGN_FORBIDDEN
-- 발생 → Server Action이 INTERNAL_ERROR를 사용자에게 노출.
--
-- 해결: GRANT EXECUTE TO service_role + REVOKE ALL FROM anon/authenticated/public이
-- 이미 access control을 하므로 함수 본문의 추가 v_role 검사는 불필요/중복.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sign_petition(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_slug          text;
  v_email         text;
  v_email_hash    text;
  v_ip_hash       text;
  v_email_salt    text;
  v_ip_salt       text;
  v_signature_id  uuid;
  v_petition      public.petitions%ROWTYPE;
BEGIN
  -- v_role 검사 제거 — GRANT EXECUTE TO service_role만 access control로 충분.
  -- request.jwt.claim.role GUC가 PostgREST 라이브 환경에서 안정적으로 노출되지 않아
  -- 함수 본문 검사가 false negative를 만들었음.

  v_slug       := p_payload->>'petition_slug';
  v_email      := p_payload->>'email';

  v_email_salt := 'f37333df3ab307ea26b31c1e600d5dfa60134e4c9724b043fed489345e8beec9';
  v_ip_salt    := 'f3b2735f2979ec3b118ee41572ba3910d146da5409906f8df56631c8d0a98ae2';

  -- 청원 활성 여부 확인
  SELECT * INTO v_petition FROM public.petitions WHERE slug = v_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PETITION_NOT_FOUND';
  END IF;
  IF NOT v_petition.is_active OR v_petition.deadline_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PETITION_CLOSED');
  END IF;

  v_email_hash := public.hash_email(v_email, v_email_salt);
  v_ip_hash    := public.hash_ip(p_payload->>'ip', v_ip_salt);

  BEGIN
    INSERT INTO public.petition_signatures (
      petition_slug, full_name, email, email_hash,
      region_top, region_sub, is_committee,
      message, message_public,
      agreed_petition, agreed_privacy, agreed_overseas,
      user_agent, ip_hash
    ) VALUES (
      v_slug,
      btrim(p_payload->>'full_name'),
      lower(btrim(v_email)),
      v_email_hash,
      p_payload->>'region_top',
      NULLIF(btrim(p_payload->>'region_sub'), ''),
      COALESCE((p_payload->>'is_committee')::boolean, false),
      NULLIF(btrim(p_payload->>'message'), ''),
      COALESCE((p_payload->>'message_public')::boolean, false),
      (p_payload->>'agreed_petition')::boolean,
      (p_payload->>'agreed_privacy')::boolean,
      (p_payload->>'agreed_overseas')::boolean,
      p_payload->>'user_agent',
      v_ip_hash
    )
    RETURNING id INTO v_signature_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL');
  END;

  RETURN jsonb_build_object('ok', true, 'id', v_signature_id);
END;
$$;
