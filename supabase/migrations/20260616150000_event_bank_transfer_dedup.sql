-- ============================================================
-- Migration: 무통장 신청 휴대폰 중복 차단 (anti-griefing)
--
-- awaiting_deposit는 만료 없이 좌석을 점유하므로(사용자 결정: 자동취소 미도입,
-- 수동 관리), 한 사람이 같은 번호로 여러 좌석을 묶는 abuse가 가능했다.
-- register_event_bank_transfer에 "같은 번호의 활성 awaiting_deposit가 이미 있으면
-- 거부" 가드를 추가한다. (좌석을 자동으로 비우지 않으므로 수동 관리 원칙 유지.)
-- 보안 리뷰(2026-06-16) HIGH 지적 대응.
-- ============================================================

CREATE OR REPLACE FUNCTION public.register_event_bank_transfer(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_slug     text;
  v_event    public.events%ROWTYPE;
  v_party    integer;
  v_amount   integer;
  v_occupied integer;
  v_status   text;
  v_order_no text;
  v_id       uuid;
  v_phone_digits text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'EVENT_REGISTER_FORBIDDEN';
  END IF;

  v_slug  := p_payload->>'event_slug';
  v_party := COALESCE((p_payload->>'party_size')::integer, 0);
  IF v_party < 1 OR v_party > 20 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_PARTY_SIZE');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('event:' || v_slug));

  SELECT * INTO v_event FROM public.events WHERE slug = v_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EVENT_NOT_FOUND');
  END IF;
  IF NOT v_event.is_active
     OR (v_event.registration_deadline IS NOT NULL AND v_event.registration_deadline <= now()) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EVENT_CLOSED');
  END IF;

  -- 휴대폰 중복 차단: 같은 번호(숫자만 비교)로 활성 입금대기 건이 있으면 거부.
  v_phone_digits := regexp_replace(COALESCE(p_payload->>'phone', ''), '[^0-9]', '', 'g');
  IF v_phone_digits <> '' AND EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_slug = v_slug
      AND status = 'awaiting_deposit'
      AND regexp_replace(phone, '[^0-9]', '', 'g') = v_phone_digits
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_DEPOSIT');
  END IF;

  v_amount   := v_event.fee_per_person * v_party;
  v_occupied := public.event_occupied_seats(v_slug);

  IF (v_event.capacity - v_occupied) >= v_party THEN
    v_status   := 'awaiting_deposit';
    v_order_no := 'EVT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  ELSE
    v_status   := 'waitlist';
    v_order_no := NULL;
  END IF;

  INSERT INTO public.event_registrations (
    event_slug, applicant_name, phone, email, party_size, boarding_confirmed,
    status, amount, order_no, hold_expires_at, agreed_privacy, user_agent, ip_hash
  ) VALUES (
    v_slug,
    btrim(p_payload->>'applicant_name'),
    btrim(p_payload->>'phone'),
    NULLIF(btrim(COALESCE(p_payload->>'email', '')), ''),
    v_party,
    COALESCE((p_payload->>'boarding_confirmed')::boolean, false),
    v_status,
    v_amount,
    v_order_no,
    NULL,
    (p_payload->>'agreed_privacy')::boolean,
    p_payload->>'user_agent',
    p_payload->>'ip_hash'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_id, 'status', v_status,
    'order_no', v_order_no, 'amount', v_amount
  );
END;
$$;
