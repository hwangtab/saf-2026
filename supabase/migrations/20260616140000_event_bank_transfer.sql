-- ============================================================
-- Migration: 추도식 무통장입금(계좌이체) 신청 지원
--
-- 작품 구매의 "계좌이체"(무통장입금)와 동일한 모델을 행사 신청에 도입:
-- 토스를 거치지 않고 신청 즉시 좌석을 확보(awaiting_deposit)하고, 입금 안내 후
-- 관리자가 입금 확인 시 confirmed로 전환한다. (24h 자동취소는 도입하지 않음 —
-- 미입금 건은 운영진이 수동 연락/취소.)
-- ============================================================

-- 1) awaiting_deposit 상태 추가 ------------------------------------
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_status_check;
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('pending', 'confirmed', 'waitlist', 'cancelled', 'expired', 'awaiting_deposit'));

-- 2) 좌석 점유에 awaiting_deposit 포함 (무통장 신청 즉시 좌석 확보) ----
CREATE OR REPLACE FUNCTION public.event_occupied_seats(p_slug text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(SUM(party_size), 0)::integer
  FROM public.event_registrations
  WHERE event_slug = p_slug
    AND (
      status = 'confirmed'
      OR status = 'awaiting_deposit'
      OR (status = 'pending' AND hold_expires_at > now())
    );
$$;

-- 3) 무통장 신청 RPC — 잔여석 있으면 awaiting_deposit(무기한 hold), 없으면 waitlist ----
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

  v_amount   := v_event.fee_per_person * v_party;
  v_occupied := public.event_occupied_seats(v_slug);

  IF (v_event.capacity - v_occupied) >= v_party THEN
    -- 무통장은 만료(hold_expires_at) 없이 좌석을 확보. 관리자 입금확인 또는 취소까지 유지.
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

-- 4) 관리자 입금확인 RPC — awaiting_deposit → confirmed ----
CREATE OR REPLACE FUNCTION public.confirm_event_bank_transfer(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_reg public.event_registrations%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'EVENT_CONFIRM_FORBIDDEN';
  END IF;

  SELECT * INTO v_reg FROM public.event_registrations WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_reg.status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', true, 'code', 'ALREADY_CONFIRMED', 'id', v_reg.id);
  END IF;
  IF v_reg.status <> 'awaiting_deposit' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATE');
  END IF;

  -- 좌석은 awaiting_deposit로 이미 점유 중이므로 추가 정원 재확인 불필요.
  UPDATE public.event_registrations
  SET status = 'confirmed', paid_at = now(), hold_expires_at = NULL, updated_at = now()
  WHERE id = v_reg.id;

  RETURN jsonb_build_object(
    'ok', true, 'code', 'CONFIRMED', 'id', v_reg.id,
    'applicant_name', v_reg.applicant_name,
    'party_size', v_reg.party_size,
    'amount', v_reg.amount,
    'phone', v_reg.phone,
    'email', v_reg.email,
    'order_no', v_reg.order_no
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_event_bank_transfer(jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.register_event_bank_transfer(jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.confirm_event_bank_transfer(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.confirm_event_bank_transfer(uuid) TO service_role;
