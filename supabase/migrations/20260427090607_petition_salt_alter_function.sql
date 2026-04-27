-- ============================================================
-- Migration: 청원 솔트를 sign_petition 본문에 hard-code (ALTER DATABASE 권한 제약 우회)
--
-- 배경: app.petition_email_salt 같은 custom GUC는 superuser만 설정 가능.
-- service role도 ALTER DATABASE / ALTER FUNCTION SET app.* 못 함.
-- → 솔트를 함수 본문 안 변수로 직접 박아 우회. 솔트 회전 시 이 마이그레이션 재실행.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sign_petition(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_role          text;
  v_slug          text;
  v_email         text;
  v_email_hash    text;
  v_ip_hash       text;
  v_email_salt    text;
  v_ip_salt       text;
  v_signature_id  uuid;
  v_petition      public.petitions%ROWTYPE;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PETITION_SIGN_FORBIDDEN';
  END IF;

  v_slug       := p_payload->>'petition_slug';
  v_email      := p_payload->>'email';

  -- 솔트는 마이그레이션 적용 시점에 hard-code된 값 사용 (운영자가 회전 원할 때 마이그레이션 재실행)
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
