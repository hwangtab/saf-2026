-- ============================================================
-- Migration: event RPC 3종의 role 가드를 auth.role()로 교체 (회귀 fix)
--
-- 배경: register_event_seat / confirm_event_registration /
-- promote_waitlist_event_registration 모두 SECURITY DEFINER 안에서
-- current_setting('request.jwt.claim.role', true)로 caller role을 확인했다.
-- 라이브 PostgREST는 이 단수 GUC를 더 이상 채우지 않아 항상 NULL →
-- service_role 키(createSupabaseAdminClient)로 호출해도 EVENT_*_FORBIDDEN throw →
-- Server Action이 사용자에게 INTERNAL_ERROR 노출. (= 추도식 신청 전면 실패)
--
-- 동일 회귀 전례: petition sign(20260427091500), check_rate_limit(20260511140000).
-- 표준 수정: auth.role()로 교체. PostgREST 버전과 무관하게
-- service_role/authenticated/anon 중 하나를 안정적으로 반환한다.
-- (GRANT EXECUTE TO service_role + REVOKE FROM anon/authenticated가
--  이미 access control을 하므로 본문 검사는 방어적 중복이지만 유지.)
-- ============================================================

-- 1) 좌석 예약 (사용자 신청 진입점) ---------------------------------
CREATE OR REPLACE FUNCTION public.register_event_seat(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_slug     text;
  v_event    public.events%ROWTYPE;
  v_party    integer;
  v_amount   integer;
  v_occupied integer;
  v_status   text;
  v_hold     timestamptz;
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
    v_status   := 'pending';
    v_hold     := now() + (COALESCE((p_payload->>'hold_minutes')::int, 15) || ' minutes')::interval;
    v_order_no := 'EVT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  ELSE
    v_status   := 'waitlist';
    v_hold     := NULL;
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
    v_hold,
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
$function$;

-- 2) 결제 확정 (Toss 승인 후) — 같이 고치지 않으면 orphaned 결제 발생 ----
CREATE OR REPLACE FUNCTION public.confirm_event_registration(
  p_order_no text, p_payment_key text, p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_reg      public.event_registrations%ROWTYPE;
  v_event    public.events%ROWTYPE;
  v_occupied integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'EVENT_CONFIRM_FORBIDDEN';
  END IF;

  SELECT * INTO v_reg FROM public.event_registrations WHERE order_no = p_order_no FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_reg.status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', true, 'code', 'ALREADY_CONFIRMED', 'id', v_reg.id);
  END IF;
  IF v_reg.amount <> p_amount THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AMOUNT_MISMATCH');
  END IF;
  IF v_reg.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATE');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('event:' || v_reg.event_slug));
  SELECT * INTO v_event FROM public.events WHERE slug = v_reg.event_slug;

  IF v_reg.hold_expires_at IS NULL OR v_reg.hold_expires_at <= now() THEN
    v_occupied := public.event_occupied_seats(v_reg.event_slug);
    IF (v_event.capacity - v_occupied) < v_reg.party_size THEN
      RETURN jsonb_build_object('ok', false, 'code', 'SOLD_OUT');
    END IF;
  END IF;

  UPDATE public.event_registrations
  SET status = 'confirmed', payment_key = p_payment_key, paid_at = now(),
      hold_expires_at = NULL, updated_at = now()
  WHERE id = v_reg.id;

  RETURN jsonb_build_object('ok', true, 'code', 'CONFIRMED', 'id', v_reg.id);
END;
$function$;

-- 3) 대기자 → pending 승격 (admin/cron) ------------------------------
CREATE OR REPLACE FUNCTION public.promote_waitlist_event_registration(
  p_id uuid,
  p_hold_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_reg      public.event_registrations%ROWTYPE;
  v_event    public.events%ROWTYPE;
  v_occupied integer;
  v_hold     timestamptz;
  v_order_no text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'EVENT_WAITLIST_PROMOTE_FORBIDDEN';
  END IF;

  SELECT * INTO v_reg
  FROM public.event_registrations
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_reg.status <> 'waitlist'
     AND NOT (
       v_reg.status = 'pending'
       AND v_reg.hold_expires_at IS NOT NULL
       AND v_reg.hold_expires_at <= now()
     ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATE');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('event:' || v_reg.event_slug));

  SELECT * INTO v_event
  FROM public.events
  WHERE slug = v_reg.event_slug;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EVENT_NOT_FOUND');
  END IF;
  IF NOT v_event.is_active
     OR (v_event.registration_deadline IS NOT NULL AND v_event.registration_deadline <= now()) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EVENT_CLOSED');
  END IF;

  v_occupied := public.event_occupied_seats(v_reg.event_slug);
  IF (v_event.capacity - v_occupied) < v_reg.party_size THEN
    RETURN jsonb_build_object('ok', false, 'code', 'SOLD_OUT');
  END IF;

  v_hold := now() + (COALESCE(p_hold_minutes, 15) || ' minutes')::interval;
  v_order_no := 'EVT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

  UPDATE public.event_registrations
  SET status = 'pending',
      order_no = v_order_no,
      hold_expires_at = v_hold,
      updated_at = now()
  WHERE id = v_reg.id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_reg.id,
    'status', 'pending',
    'order_no', v_order_no,
    'amount', v_reg.amount,
    'party_size', v_reg.party_size,
    'applicant_name', v_reg.applicant_name,
    'phone', v_reg.phone,
    'email', v_reg.email
  );
END;
$$;
