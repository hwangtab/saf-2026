-- 대기자 결제 안내 개선:
-- 기존 waitlist 행을 새 신청으로 중복 생성하지 않고, 같은 행을 pending으로 승격해 결제를 이어간다.

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
  v_role     text;
  v_reg      public.event_registrations%ROWTYPE;
  v_event    public.events%ROWTYPE;
  v_occupied integer;
  v_hold     timestamptz;
  v_order_no text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
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

REVOKE ALL ON FUNCTION public.promote_waitlist_event_registration(uuid, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.promote_waitlist_event_registration(uuid, integer) TO service_role;
