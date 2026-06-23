-- 결제 확정: pending_payment → paid. event confirm_event_registration 미러.
-- 한정 티어는 hold 만료 시 잔량 재검증(oversell 방지). 상태 전이 자체가 멱등 보장.

CREATE OR REPLACE FUNCTION public.confirm_funding_pledge(
  p_order_no text, p_payment_key text, p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_pledge  public.funding_pledges%ROWTYPE;
  v_tier    public.reward_tiers%ROWTYPE;
  v_item    public.pledge_items%ROWTYPE;
  v_claimed integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'FUNDING_CONFIRM_FORBIDDEN';
  END IF;

  SELECT * INTO v_pledge FROM public.funding_pledges WHERE order_no = p_order_no FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_pledge.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'code', 'ALREADY_PAID', 'id', v_pledge.id);
  END IF;
  IF v_pledge.total_amount <> p_amount THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AMOUNT_MISMATCH');
  END IF;
  IF v_pledge.status <> 'pending_payment' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATE');
  END IF;

  -- 단일 티어(1차) — 한정 티어면 잔량 재검증
  SELECT * INTO v_item FROM public.pledge_items WHERE pledge_id = v_pledge.id LIMIT 1;
  SELECT * INTO v_tier FROM public.reward_tiers WHERE id = v_item.reward_tier_id;
  IF v_tier.total_quantity IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('reward:' || v_tier.id::text));
    IF v_pledge.hold_expires_at IS NULL OR v_pledge.hold_expires_at <= now() THEN
      v_claimed := public.funding_tier_claimed(v_tier.id);
      -- 미만료 pending(자기 자신 hold 만료 시 제외됨)이 한도를 넘으면 거부
      IF (v_tier.total_quantity - v_claimed) < 0 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'TIER_SOLD_OUT');
      END IF;
    END IF;
  END IF;

  UPDATE public.funding_pledges
  SET status = 'paid', paid_at = now(), hold_expires_at = NULL, updated_at = now()
  WHERE id = v_pledge.id;

  RETURN jsonb_build_object('ok', true, 'code', 'CONFIRMED', 'id', v_pledge.id);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_funding_pledge(text, text, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.confirm_funding_pledge(text, text, integer) TO service_role;
