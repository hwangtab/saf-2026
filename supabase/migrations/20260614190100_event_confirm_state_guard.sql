-- 보안: confirm_event_registration 이 pending 외 상태(특히 환불 후 cancelled)에서도
-- confirmed 로 승격시키는 state-machine 결함 수정. 환불+취소된 신청에 옛 success URL을
-- replay 하면 토스 idempotency 로 재과금 없이 재확정되는 un-cancel 취약점.
-- → 승격 source 상태를 'pending' 으로만 제한.

CREATE OR REPLACE FUNCTION public.confirm_event_registration(
  p_order_no text, p_payment_key text, p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role     text;
  v_reg      public.event_registrations%ROWTYPE;
  v_event    public.events%ROWTYPE;
  v_occupied integer;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
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
  -- 합법적 승격은 pending(결제대기) 에서만. cancelled/expired/waitlist 는 replay 차단.
  -- (만료된 hold 도 status 는 여전히 'pending' 이므로 늦은 결제 정상 처리됨.)
  IF v_reg.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATE');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('event:' || v_reg.event_slug));
  SELECT * INTO v_event FROM public.events WHERE slug = v_reg.event_slug;

  -- hold 가 만료된 경우(다른 confirmed 가 자리를 채웠을 수 있음) 재확인
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
$$;
