-- 후원 1건 생성(단일 티어 × 수량). 한정 티어면 티어별 advisory lock + 파생 SUM 잔량 검사.
-- 금액은 서버가 reward_tiers.amount * quantity로 계산(클라 amount 무시).

CREATE OR REPLACE FUNCTION public.create_funding_pledge(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_proj     public.funding_projects%ROWTYPE;
  v_tier     public.reward_tiers%ROWTYPE;
  v_qty      integer;
  v_amount   integer;
  v_claimed  integer;
  v_hold     timestamptz;
  v_order_no text;
  v_pledge_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'FUNDING_PLEDGE_FORBIDDEN';
  END IF;

  v_qty := COALESCE((p_payload->>'quantity')::integer, 0);
  IF v_qty < 1 OR v_qty > 50 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  END IF;

  SELECT * INTO v_proj FROM public.funding_projects WHERE slug = p_payload->>'project_slug';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PROJECT_NOT_FOUND');
  END IF;
  IF v_proj.status <> 'active'
     OR (v_proj.end_at IS NOT NULL AND v_proj.end_at <= now()) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PROJECT_CLOSED');
  END IF;

  SELECT * INTO v_tier FROM public.reward_tiers
    WHERE id = (p_payload->>'reward_tier_id')::uuid AND project_id = v_proj.id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'TIER_NOT_FOUND');
  END IF;

  v_amount := v_tier.amount * v_qty;

  -- 한정 티어만 직렬화(무제한 티어는 lock 생략)
  IF v_tier.total_quantity IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('reward:' || v_tier.id::text));
    v_claimed := public.funding_tier_claimed(v_tier.id);
    IF (v_tier.total_quantity - v_claimed) < v_qty THEN
      RETURN jsonb_build_object('ok', false, 'code', 'TIER_SOLD_OUT');
    END IF;
  END IF;

  v_hold := now() + (COALESCE((p_payload->>'hold_minutes')::int, 30) || ' minutes')::interval;
  v_order_no := 'FND-' || to_char(now(), 'YYYYMMDD') || '-'
                || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.funding_pledges (
    project_id, order_no, backer_user_id, backer_name, backer_email, backer_phone,
    total_amount, status, hold_expires_at,
    shipping_name, shipping_phone, shipping_address, shipping_postal_code, shipping_memo,
    is_anonymous, supporter_message, message_public,
    agreed_terms, agreed_privacy, agreed_withdrawal_waiver, user_agent, ip_hash
  ) VALUES (
    v_proj.id, v_order_no,
    NULLIF(p_payload->>'backer_user_id','')::uuid,
    btrim(p_payload->>'backer_name'),
    btrim(p_payload->>'backer_email'),
    btrim(p_payload->>'backer_phone'),
    v_amount, 'pending_payment', v_hold,
    NULLIF(btrim(COALESCE(p_payload->>'shipping_name','')),''),
    NULLIF(btrim(COALESCE(p_payload->>'shipping_phone','')),''),
    NULLIF(btrim(COALESCE(p_payload->>'shipping_address','')),''),
    NULLIF(btrim(COALESCE(p_payload->>'shipping_postal_code','')),''),
    NULLIF(btrim(COALESCE(p_payload->>'shipping_memo','')),''),
    COALESCE((p_payload->>'is_anonymous')::boolean, false),
    NULLIF(btrim(COALESCE(p_payload->>'supporter_message','')),''),
    COALESCE((p_payload->>'message_public')::boolean, false),
    (p_payload->>'agreed_terms')::boolean,
    (p_payload->>'agreed_privacy')::boolean,
    COALESCE((p_payload->>'agreed_withdrawal_waiver')::boolean, false),
    p_payload->>'user_agent', p_payload->>'ip_hash'
  )
  RETURNING id INTO v_pledge_id;

  INSERT INTO public.pledge_items (pledge_id, reward_tier_id, quantity, unit_amount)
  VALUES (v_pledge_id, v_tier.id, v_qty, v_tier.amount);

  RETURN jsonb_build_object('ok', true, 'id', v_pledge_id, 'order_no', v_order_no, 'amount', v_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.create_funding_pledge(jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.create_funding_pledge(jsonb) TO service_role;
