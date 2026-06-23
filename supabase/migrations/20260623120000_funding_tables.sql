-- 크라우드펀딩(Keep-it-All, 전부 리워드형) 백엔드 스키마.
-- 작품 payments(order_id NOT NULL)와 충돌 방지 위해 funding_payments 별도 테이블.
-- 동시성은 좌석(event) 패턴 차용: advisory lock + 파생 SUM 점유 + hold TTL.

CREATE TABLE IF NOT EXISTS public.funding_projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  summary       text,
  story         text,
  cover_image   text,
  category      text,
  goal_amount   integer NOT NULL CHECK (goal_amount > 0),
  funding_type  text NOT NULL DEFAULT 'keep_it_all' CHECK (funding_type IN ('keep_it_all')),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed','settled')),
  start_at      timestamptz,
  end_at        timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_tiers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.funding_projects(id) ON DELETE CASCADE,
  title             text NOT NULL,
  description       text,
  amount            integer NOT NULL CHECK (amount > 0),
  total_quantity    integer CHECK (total_quantity IS NULL OR total_quantity > 0),
  requires_shipping boolean NOT NULL DEFAULT false,
  is_made_to_order  boolean NOT NULL DEFAULT false,
  estimated_delivery date,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.funding_pledges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.funding_projects(id) ON DELETE RESTRICT,
  order_no        text UNIQUE,
  backer_user_id  uuid,
  backer_name     text NOT NULL CHECK (char_length(btrim(backer_name)) BETWEEN 1 AND 100),
  backer_email    text NOT NULL,
  backer_phone    text NOT NULL,
  total_amount    integer NOT NULL CHECK (total_amount > 0),
  status          text NOT NULL CHECK (status IN ('pending_payment','paid','cancelled','refunded','expired')),
  hold_expires_at timestamptz,
  shipping_name        text,
  shipping_phone       text,
  shipping_address     text,
  shipping_postal_code text,
  shipping_memo        text,
  is_anonymous    boolean NOT NULL DEFAULT false,
  supporter_message text CHECK (supporter_message IS NULL OR char_length(supporter_message) <= 500),
  message_public  boolean NOT NULL DEFAULT false,
  paid_at         timestamptz,
  cancelled_at    timestamptz,
  refunded_at     timestamptz,
  agreed_terms    boolean NOT NULL CHECK (agreed_terms = true),
  agreed_privacy  boolean NOT NULL CHECK (agreed_privacy = true),
  agreed_withdrawal_waiver boolean NOT NULL DEFAULT false,
  user_agent      text,
  ip_hash         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pledge_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id      uuid NOT NULL REFERENCES public.funding_pledges(id) ON DELETE CASCADE,
  reward_tier_id uuid NOT NULL REFERENCES public.reward_tiers(id) ON DELETE RESTRICT,
  quantity       integer NOT NULL CHECK (quantity > 0),
  unit_amount    integer NOT NULL CHECK (unit_amount > 0),
  option_values  jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(pledge_id, reward_tier_id)
);

CREATE TABLE IF NOT EXISTS public.funding_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id        uuid NOT NULL REFERENCES public.funding_pledges(id) ON DELETE RESTRICT,
  payment_key      text UNIQUE,
  toss_order_id    text,
  method           text,
  amount           integer NOT NULL,
  currency         text NOT NULL DEFAULT 'KRW',
  status           text NOT NULL,
  approved_at      timestamptz,
  cancelled_at     timestamptz,
  confirm_response jsonb,
  webhook_responses jsonb NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key  text UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funding_pledges_project_status
  ON public.funding_pledges (project_id, status);
CREATE INDEX IF NOT EXISTS idx_funding_pledges_pending_hold
  ON public.funding_pledges (status, hold_expires_at) WHERE status = 'pending_payment';
CREATE INDEX IF NOT EXISTS idx_funding_pledges_public_list
  ON public.funding_pledges (project_id, paid_at DESC) WHERE status = 'paid';
CREATE INDEX IF NOT EXISTS idx_pledge_items_tier
  ON public.pledge_items (reward_tier_id);

ALTER TABLE public.funding_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_payments ENABLE ROW LEVEL SECURITY;
-- 정책 미생성 = 기본 deny. 모든 접근은 service_role(RPC/admin client) 경유.
-- 공개 표시는 집계 RPC(SECURITY DEFINER)로만 노출.
