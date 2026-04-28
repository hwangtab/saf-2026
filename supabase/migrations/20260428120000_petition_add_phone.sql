-- ============================================================
-- Migration: petition_signatures에 전화번호(phone) 평문 컬럼 추가
--
-- 배경: 기존에는 이메일만 수집해서 운영자가 서명자에게 직접 연락(전화)
-- 할 수단이 없었음. 청원 진행 상황 안내·언론 인터뷰 협조·시 측 전달
-- 시점 등 운영 필요로 전화번호를 함께 수집.
--
-- 정책:
--   - NULL 허용 (기존 행 호환).
--   - 평문 저장 (연락 목적). RLS로 service_role / authenticated admin만 SELECT.
--   - 정규화는 server action 단에서 처리(공백/하이픈 자유). DB는 길이만 검증.
--   - 봇·중복 차단은 기존 email_hash UNIQUE 그대로 — phone에는 unique 안 검(가족 공유 회선 허용).
-- ============================================================

ALTER TABLE public.petition_signatures
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.petition_signatures
  DROP CONSTRAINT IF EXISTS petition_signatures_phone_length;

ALTER TABLE public.petition_signatures
  ADD CONSTRAINT petition_signatures_phone_length
    CHECK (phone IS NULL OR char_length(btrim(phone)) BETWEEN 9 AND 30);

-- ────────────────────────────────────────────────────────────
-- sign_petition RPC 갱신 — payload에 phone 포함해 INSERT
-- 솔트는 기존 마이그레이션의 hard-coded 값 그대로 유지.
-- ────────────────────────────────────────────────────────────
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
      agreed_petition, agreed_privacy, agreed_overseas,
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
