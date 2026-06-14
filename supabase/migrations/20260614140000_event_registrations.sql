-- 오윤 40주기 추도식 행사 신청 시스템
-- events: 행사 메타(정원/회비/마감). 단일 행사라도 capacity admin 조정 위해 테이블화.
-- event_registrations: 참가 신청. 좌석 동시성은 register_event_seat RPC(advisory lock)로 보장.

CREATE TABLE IF NOT EXISTS public.events (
  slug            text PRIMARY KEY,
  title           text NOT NULL,
  capacity        integer NOT NULL CHECK (capacity >= 0),
  fee_per_person  integer NOT NULL CHECK (fee_per_person >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  registration_deadline timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 시드: 오윤 추도식 (정원 44석, 회비 3만원, 마감 행사일 당일 오전)
INSERT INTO public.events (slug, title, capacity, fee_per_person, registration_deadline)
VALUES ('oh-yoon-memorial', '오윤 40주기 추도식', 44, 30000, '2026-07-05T08:00:00+09:00')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug      text NOT NULL REFERENCES public.events(slug) ON DELETE RESTRICT,

  applicant_name  text NOT NULL CHECK (char_length(btrim(applicant_name)) BETWEEN 1 AND 100),
  phone           text NOT NULL,
  email           text,

  party_size      integer NOT NULL CHECK (party_size BETWEEN 1 AND 20),
  boarding_confirmed boolean NOT NULL DEFAULT false,

  -- pending: 결제대기(좌석 hold) / confirmed: 결제완료 / waitlist: 대기 / cancelled / expired
  status          text NOT NULL CHECK (status IN ('pending', 'confirmed', 'waitlist', 'cancelled', 'expired')),

  amount          integer NOT NULL CHECK (amount >= 0),   -- party_size * fee, 서버 계산
  order_no        text UNIQUE,                            -- 토스 주문번호 겸 customerKey
  payment_key     text,
  paid_at         timestamptz,
  hold_expires_at timestamptz,                            -- pending 만료(생성+15분)

  agreed_privacy  boolean NOT NULL CHECK (agreed_privacy = true),

  user_agent      text,
  ip_hash         text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_reg_slug_status
  ON public.event_registrations (event_slug, status);
CREATE INDEX IF NOT EXISTS idx_event_reg_slug_created
  ON public.event_registrations (event_slug, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
-- 공개/인증 클라이언트 직접 접근 차단. 모든 접근은 service_role(RPC/admin client) 경유.
-- (정책 미생성 = 기본 deny. petition_signatures와 동일 전략.)

-- 점유 좌석 = confirmed + 미만료 pending 의 party_size 합
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
      OR (status = 'pending' AND hold_expires_at > now())
    );
$$;

-- 좌석 현황(공개 페이지 표시용): capacity / occupied / remaining / is_open
CREATE OR REPLACE FUNCTION public.event_seat_status(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_occupied integer;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  v_occupied := public.event_occupied_seats(p_slug);
  RETURN jsonb_build_object(
    'found', true,
    'capacity', v_event.capacity,
    'occupied', v_occupied,
    'remaining', GREATEST(v_event.capacity - v_occupied, 0),
    'is_open', v_event.is_active
      AND (v_event.registration_deadline IS NULL OR v_event.registration_deadline > now())
      AND (v_event.capacity - v_occupied) > 0,
    'fee_per_person', v_event.fee_per_person
  );
END;
$$;

-- 좌석 예약(원자적). advisory lock으로 같은 행사 신청을 직렬화.
-- 잔여석 >= party_size → pending(hold) 생성, 부족 → waitlist 생성.
CREATE OR REPLACE FUNCTION public.register_event_seat(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role     text;
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
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'EVENT_REGISTER_FORBIDDEN';
  END IF;

  v_slug  := p_payload->>'event_slug';
  v_party := COALESCE((p_payload->>'party_size')::integer, 0);
  IF v_party < 1 OR v_party > 20 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_PARTY_SIZE');
  END IF;

  -- 같은 행사 신청 직렬화 (트랜잭션 종료 시 자동 해제)
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
$$;

-- 결제 확정: pending → confirmed. hold 만료됐어도 좌석 재확인 후 승격, 초과 시 거부.
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

  PERFORM pg_advisory_xact_lock(hashtext('event:' || v_reg.event_slug));
  SELECT * INTO v_event FROM public.events WHERE slug = v_reg.event_slug;

  -- hold가 만료된 경우(다른 confirmed가 자리를 채웠을 수 있음) 재확인
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

REVOKE ALL ON FUNCTION public.register_event_seat(jsonb) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.confirm_event_registration(text, text, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.register_event_seat(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_event_registration(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.event_seat_status(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.event_occupied_seats(text) TO service_role;
