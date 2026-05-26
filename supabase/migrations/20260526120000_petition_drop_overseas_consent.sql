-- ============================================================
-- Migration: agreed_overseas 동의 수집 모델 → 처리방침 공개 모델 전환
--
-- 배경:
--   개인정보보호법 제28조의8 ①항 제3호 가목에 따라, 서비스 계약의 체결·이행에
--   필요한 처리위탁·보관이고 ②항 각 호 사항을 개인정보 처리방침에 공개하면
--   별도 동의 없이 국외 이전이 가능함. 자문 변호사 검토 후 결정.
--
-- 변경 내용:
--   - agreed_overseas 컬럼 유지 (과거 동의 기록 보존), 제약만 해제
--   - 신규 INSERT에서 agreed_overseas를 생략 → NULL 저장
--   - sign_petition RPC: agreed_overseas INSERT 라인 제거
-- ============================================================

-- 1) NOT NULL 제거
ALTER TABLE public.petition_signatures
  ALTER COLUMN agreed_overseas DROP NOT NULL;

-- 2) inline CHECK 제약 제거 (시스템 자동 이름: petition_signatures_agreed_overseas_check)
ALTER TABLE public.petition_signatures
  DROP CONSTRAINT IF EXISTS petition_signatures_agreed_overseas_check;

-- 3) sign_petition RPC 재정의 (base: 20260428120000_petition_add_phone.sql)
--    agreed_overseas INSERT 라인만 제거
CREATE OR REPLACE FUNCTION public.sign_petition(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_slug          text;
  v_email         text;
  v_phone         text;
  v_email_hash    text;
  v_ip_hash       text;
  v_email_salt    text;
  v_ip_salt       text;
  v_signature_id  uuid;
  v_petition      public.petitions%ROWTYPE;
BEGIN
  v_slug       := p_payload->>'petition_slug';
  v_email      := p_payload->>'email';
  v_phone      := NULLIF(btrim(p_payload->>'phone'), '');

  v_email_salt := 'f37333df3ab307ea26b31c1e600d5dfa60134e4c9724b043fed489345e8beec9';
  v_ip_salt    := 'f3b2735f2979ec3b118ee41572ba3910d146da5409906f8df56631c8d0a98ae2';

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
      petition_slug, full_name, email, email_hash, phone,
      region_top, region_sub, is_committee,
      message, message_public,
      agreed_petition, agreed_privacy,
      user_agent, ip_hash
    ) VALUES (
      v_slug,
      btrim(p_payload->>'full_name'),
      lower(btrim(v_email)),
      v_email_hash,
      v_phone,
      p_payload->>'region_top',
      NULLIF(btrim(p_payload->>'region_sub'), ''),
      COALESCE((p_payload->>'is_committee')::boolean, false),
      NULLIF(btrim(p_payload->>'message'), ''),
      COALESCE((p_payload->>'message_public')::boolean, false),
      (p_payload->>'agreed_petition')::boolean,
      (p_payload->>'agreed_privacy')::boolean,
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

REVOKE ALL ON FUNCTION public.sign_petition(jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.sign_petition(jsonb) TO service_role;
