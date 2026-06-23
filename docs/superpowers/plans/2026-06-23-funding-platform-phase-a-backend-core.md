# 크라우드펀딩 Phase A — 후원 코어 백엔드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오윤 테라코타 이전 모금의 후원 결제가 DB·RPC·API 레벨에서 동작하고 테스트되는 백엔드 코어를 구축한다(공개 UI·admin·약관은 후속 Phase).

**Architecture:** 전용 `funding_*` 테이블 + 별도 `funding_payments`(작품 결제 무영향). 좌석(event) RPC 패턴을 미러 — advisory lock + 파생 SUM 점유 + hold TTL + `auth.role()='service_role'` 가드 + confirm 재검증. confirm/webhook route는 event confirm route를 베이스로 한 얇은 adapter. 카드 즉시결제·단일 티어만(1차).

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase(Postgres SECURITY DEFINER RPC), Toss Payments(domestic MID), Jest.

## Global Constraints

- 모든 신규 SECURITY DEFINER RPC: `IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION` — `current_setting('request.jwt.claim.role')` 절대 금지(라이브 NULL 회귀 3회). `SET search_path TO 'public', 'pg_catalog'` 고정.
- 마이그레이션은 `supabase/migrations/`에 작성. 적용은 `supabase db query --linked -f <파일>` 단건(여러 pending 시 `db push` 금지).
- 모든 RPC는 `REVOKE ALL FROM anon, authenticated, public` + `GRANT EXECUTE TO service_role`.
- 후원자 PII 테이블은 RLS 기본 deny(INSERT 정책 만들지 않음, 전 쓰기 service_role RPC 경유).
- order_no prefix `FND-`. idempotency_key prefix `fnd-confirm-` / `fnd-webhook-`.
- 금액은 서버 RPC가 `reward_tiers.amount * quantity`로 계산. 클라이언트 amount 폐기.
- 1차 범위: 카드 즉시결제(`toss.status === 'DONE'`)만, 후원 = 단일 티어 × 수량. 가상계좌·다티어·부분환불 제외.
- 결제 완료(`paid`)에만 알림. `after()` + `runAllSettled`로 응답 후 발송(bare void 금지).
- 평문 IP 저장 금지 — `ip_hash`(기존 `hash_ip` 재사용).
- TypeScript: `as any`/`@ts-ignore` 금지. SafeImage 등 프로젝트 규칙 준수.

---

### Task 0: saf-refactor 머지 게이트 & 작업 브랜치

**Files:** 없음(환경 점검)

- [ ] **Step 1: saf-refactor 미커밋/머지 상태 확인**

Run: `git log --oneline -5 origin/main | cat && git status --short | grep -E 'lib/commerce|payment-lifecycle' | cat`
Expected: `lib/commerce/payment-lifecycle/`가 main에 머지됐거나, 작업 트리에 그린 상태로 존재. 펀딩은 별도 `funding_payments`·별도 route라 파일 충돌은 없으나, `lib/integrations/toss/`(confirm/cancel/webhook) 시그니처가 리팩토링 대상이므로 최신 인터페이스를 확인한다.

- [ ] **Step 2: 현재 브랜치가 `feat/funding-platform`인지 확인**

Run: `git branch --show-current`
Expected: `feat/funding-platform` (아니면 `git checkout feat/funding-platform`)

- [ ] **Step 3: Toss confirm/cancel 시그니처 확인**

Read: [lib/integrations/toss/confirm.ts](../../../lib/integrations/toss/confirm.ts), [lib/integrations/toss/cancel.ts](../../../lib/integrations/toss/cancel.ts)
확인: `confirmPayment(params, idempotencyKey, provider)` / `cancelPayment(paymentKey, body, idempotencyKey, provider)` 시그니처가 event confirm route가 쓰는 형태와 동일한지. Task 7·8에서 이 시그니처를 그대로 사용한다.

---

### Task 1: 펀딩 테이블 마이그레이션 (스키마 + 인덱스 + RLS)

**Files:**

- Create: `supabase/migrations/20260623120000_funding_tables.sql`

**Interfaces:**

- Produces: 테이블 `funding_projects` / `reward_tiers` / `funding_pledges` / `pledge_items` / `funding_payments` — 이후 모든 RPC·route가 이 컬럼을 참조.

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
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
-- 공개 표시는 Task 2의 집계 RPC(SECURITY DEFINER)로만 노출.
```

- [ ] **Step 2: 로컬 적용 검증**

Run: `supabase db query --linked -f supabase/migrations/20260623120000_funding_tables.sql`
Expected: 에러 없이 `CREATE TABLE`/`CREATE INDEX`/`ALTER TABLE` 완료. (⚠️ production에 즉시 반영됨 — 사용자 컨펌 후 실행. 로컬 dev DB 검증을 원하면 `supabase db reset` 환경에서 먼저.)

- [ ] **Step 3: 타입 생성**

Run: `supabase gen types typescript --linked > types/supabase.ts && npm run type-check`
Expected: `funding_projects` 등 신규 테이블 타입 생성, 타입체크 통과.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20260623120000_funding_tables.sql types/supabase.ts
git commit -m "feat(funding): add funding tables schema (projects, tiers, pledges, items, payments)

요약: 크라우드펀딩 백엔드 테이블 5종 + 인덱스 + RLS 기본 deny"
```

---

### Task 2: 집계·점유 RPC (파생 SUM)

**Files:**

- Create: `supabase/migrations/20260623120100_funding_aggregate_rpc.sql`

**Interfaces:**

- Produces:
  - `funding_tier_claimed(p_tier_id uuid) RETURNS integer` — 한정 티어 점유 수량(paid + 미만료 pending)
  - `funding_project_status(p_slug text) RETURNS jsonb` — 공개 표시용 `{found, goal_amount, raised_amount, backer_count, status, is_open, end_at}`

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- 점유·진행률은 캐시 컬럼이 아니라 파생 SUM(좌석 패턴). 만료 pending은 now() 비교로 자동 제외.

CREATE OR REPLACE FUNCTION public.funding_tier_claimed(p_tier_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT COALESCE(SUM(pi.quantity), 0)::integer
  FROM public.pledge_items pi
  JOIN public.funding_pledges p ON p.id = pi.pledge_id
  WHERE pi.reward_tier_id = p_tier_id
    AND ( p.status = 'paid'
       OR (p.status = 'pending_payment' AND p.hold_expires_at > now()) );
$$;

CREATE OR REPLACE FUNCTION public.funding_project_status(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_proj   public.funding_projects%ROWTYPE;
  v_raised integer;
  v_backers integer;
BEGIN
  SELECT * INTO v_proj FROM public.funding_projects WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  SELECT COALESCE(SUM(total_amount),0)::integer, COUNT(*)::integer
    INTO v_raised, v_backers
  FROM public.funding_pledges
  WHERE project_id = v_proj.id AND status = 'paid';
  RETURN jsonb_build_object(
    'found', true,
    'goal_amount', v_proj.goal_amount,
    'raised_amount', v_raised,
    'backer_count', v_backers,
    'status', v_proj.status,
    'end_at', v_proj.end_at,
    'is_open', v_proj.status = 'active'
      AND (v_proj.end_at IS NULL OR v_proj.end_at > now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.funding_tier_claimed(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.funding_project_status(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.funding_tier_claimed(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.funding_project_status(text) TO service_role;
```

- [ ] **Step 2: 적용 + 커밋**

```bash
supabase db query --linked -f supabase/migrations/20260623120100_funding_aggregate_rpc.sql
git add supabase/migrations/20260623120100_funding_aggregate_rpc.sql
git commit -m "feat(funding): add derived-SUM aggregate RPC (tier claimed, project status)

요약: 캐시 컬럼 없이 파생 집계로 진행률·티어 점유 산정"
```

---

### Task 3: create_funding_pledge RPC (advisory lock + 금액 서버계산 + hold)

**Files:**

- Create: `supabase/migrations/20260623120200_create_funding_pledge_rpc.sql`

**Interfaces:**

- Consumes: `funding_tier_claimed`(Task 2)
- Produces: `create_funding_pledge(p_payload jsonb) RETURNS jsonb` — 성공 시 `{ok:true, id, order_no, amount}`, 실패 시 `{ok:false, code}`. code ∈ `INVALID_INPUT|PROJECT_NOT_FOUND|PROJECT_CLOSED|TIER_NOT_FOUND|TIER_SOLD_OUT`.

- [ ] **Step 1: 마이그레이션 작성**

```sql
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
```

- [ ] **Step 2: 적용 + 커밋**

```bash
supabase db query --linked -f supabase/migrations/20260623120200_create_funding_pledge_rpc.sql
git add supabase/migrations/20260623120200_create_funding_pledge_rpc.sql
git commit -m "feat(funding): add create_funding_pledge RPC (tier lock, server amount, hold TTL)

요약: 후원 생성 — 티어별 advisory lock·서버 금액계산·30분 hold"
```

---

### Task 4: confirm_funding_pledge RPC (state guard + 재검증 + 멱등)

**Files:**

- Create: `supabase/migrations/20260623120300_confirm_funding_pledge_rpc.sql`

**Interfaces:**

- Consumes: `funding_tier_claimed`(Task 2)
- Produces: `confirm_funding_pledge(p_order_no text, p_payment_key text, p_amount integer) RETURNS jsonb` — `{ok, code}`. code ∈ `CONFIRMED|ALREADY_PAID|NOT_FOUND|AMOUNT_MISMATCH|INVALID_STATE|TIER_SOLD_OUT`. `status='pending_payment'`에서만 승격(멱등·replay 차단).

- [ ] **Step 1: 마이그레이션 작성**

```sql
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
      -- 자기 자신(pending)을 제외한 점유가 잔량을 넘으면 거부
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
```

> 참고: 자기 자신을 점유에서 제외한 정밀 oversell 검사는 `funding_tier_claimed`가 미만료 pending(자기 포함)을 세므로, hold 만료 시 자기 row는 이미 점유에서 빠진다. paid 승격 직전 잔량이 음수면 다른 결제가 마지막 자리를 가져간 것 → `TIER_SOLD_OUT`. 1차는 단일 티어라 이 가드로 충분.

- [ ] **Step 2: 적용 + 커밋**

```bash
supabase db query --linked -f supabase/migrations/20260623120300_confirm_funding_pledge_rpc.sql
git add supabase/migrations/20260623120300_confirm_funding_pledge_rpc.sql
git commit -m "feat(funding): add confirm_funding_pledge RPC (state guard, oversell recheck, idempotent)

요약: 후원 결제확정 — pending에서만 승격, 한정티어 재검증, 멱등"
```

---

### Task 5: 펀딩 도메인 유틸 (order_no 판별 + 금액 검증) — 순수함수 TDD

**Files:**

- Create: `lib/funding/order-id.ts`
- Test: `__tests__/lib/funding/order-id.test.ts`

**Interfaces:**

- Produces: `isFundingOrderId(orderId: string): boolean` — `FND-` prefix 판별. Task 8 webhook 격리에서 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
import { isFundingOrderId } from '@/lib/funding/order-id';

describe('isFundingOrderId', () => {
  it('returns true for FND- prefixed order numbers', () => {
    expect(isFundingOrderId('FND-20260623-A1B2C3D4')).toBe(true);
  });
  it('returns false for artwork (SAF-) and event (EVT-) orders', () => {
    expect(isFundingOrderId('SAF-20260623-0001')).toBe(false);
    expect(isFundingOrderId('EVT-ABCDEF0123456789')).toBe(false);
  });
  it('returns false for empty or nullish-ish input', () => {
    expect(isFundingOrderId('')).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/lib/funding/order-id.test.ts`
Expected: FAIL — `Cannot find module '@/lib/funding/order-id'`

- [ ] **Step 3: 구현**

```typescript
/** 펀딩 후원 주문번호 판별. 작품(SAF-)·행사(EVT-) 결제와 webhook을 격리하는 데 사용. */
export function isFundingOrderId(orderId: string): boolean {
  return typeof orderId === 'string' && orderId.startsWith('FND-');
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/lib/funding/order-id.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/funding/order-id.ts __tests__/lib/funding/order-id.test.ts
git commit -m "feat(funding): add isFundingOrderId order-id discriminator

요약: FND- 주문번호 판별 유틸(webhook 격리용)"
```

---

### Task 6: createPledge Server Action

**Files:**

- Create: `app/actions/funding.ts`
- Test: `__tests__/actions/funding.test.ts`

**Interfaces:**

- Consumes: RPC `create_funding_pledge`(Task 3), `hash_ip`(기존), `checkRateLimit`(기존 [lib/rate-limit.ts](../../../lib/rate-limit.ts)), checkout token util([lib/commerce/checkout/checkout-session.ts](../../../lib/commerce/checkout/checkout-session.ts)).
- Produces: `createPledge(input: CreatePledgeInput): Promise<CreatePledgeResult>` — `{ ok: true, orderNo, amount } | { ok: false, code }`. code ∈ `INVALID_INPUT|RATE_LIMITED|PROJECT_CLOSED|TIER_SOLD_OUT|INTERNAL_ERROR`.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
import { createPledge } from '@/app/actions/funding';

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(),
}));
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn() }));

const { createSupabaseAdminClient } = require('@/lib/auth/server');
const { checkRateLimit } = require('@/lib/rate-limit');

const baseInput = {
  projectSlug: 'oh-yoon-terracotta',
  rewardTierId: '11111111-1111-1111-1111-111111111111',
  quantity: 1,
  backerName: '김후원',
  backerEmail: 'a@b.com',
  backerPhone: '01012345678',
  agreedTerms: true,
  agreedPrivacy: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  checkRateLimit.mockResolvedValue({ allowed: true });
});

it('returns INVALID_INPUT when terms not agreed', async () => {
  const res = await createPledge({ ...baseInput, agreedTerms: false });
  expect(res).toEqual({ ok: false, code: 'INVALID_INPUT' });
});

it('returns RATE_LIMITED when rate limit exceeded', async () => {
  checkRateLimit.mockResolvedValue({ allowed: false });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'RATE_LIMITED' });
});

it('maps RPC TIER_SOLD_OUT to result code', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({ data: { ok: false, code: 'TIER_SOLD_OUT' }, error: null }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'TIER_SOLD_OUT' });
});

it('returns orderNo and amount on success', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({
      data: { ok: true, id: 'p1', order_no: 'FND-20260623-AAAA0000', amount: 30000 },
      error: null,
    }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: true, orderNo: 'FND-20260623-AAAA0000', amount: 30000 });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/actions/funding.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

```typescript
'use server';

import { headers } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { hashIp } from '@/lib/petition/ip'; // 기존 ip_hash 유틸(없으면 lib/petition에서 재사용 경로 확인)

export interface CreatePledgeInput {
  projectSlug: string;
  rewardTierId: string;
  quantity: number;
  backerName: string;
  backerEmail: string;
  backerPhone: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingPostalCode?: string;
  shippingMemo?: string;
  isAnonymous?: boolean;
  supporterMessage?: string;
  messagePublic?: boolean;
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  agreedWithdrawalWaiver?: boolean;
}

export type CreatePledgeResult =
  | { ok: true; orderNo: string; amount: number }
  | {
      ok: false;
      code:
        | 'INVALID_INPUT'
        | 'RATE_LIMITED'
        | 'PROJECT_CLOSED'
        | 'TIER_SOLD_OUT'
        | 'INTERNAL_ERROR';
    };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createPledge(input: CreatePledgeInput): Promise<CreatePledgeResult> {
  // 검증
  if (
    !input.agreedTerms ||
    !input.agreedPrivacy ||
    !input.backerName?.trim() ||
    input.backerName.trim().length > 100 ||
    !EMAIL_RE.test(input.backerEmail ?? '') ||
    (input.backerPhone ?? '').replace(/\D/g, '').length < 9 ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 50 ||
    (input.supporterMessage?.length ?? 0) > 500
  ) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await checkRateLimit(`funding:pledge:${ip}`, 10, 60);
  if (!rl.allowed) return { ok: false, code: 'RATE_LIMITED' };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('create_funding_pledge', {
    p_payload: {
      project_slug: input.projectSlug,
      reward_tier_id: input.rewardTierId,
      quantity: input.quantity,
      backer_name: input.backerName,
      backer_email: input.backerEmail,
      backer_phone: input.backerPhone,
      shipping_name: input.shippingName ?? '',
      shipping_phone: input.shippingPhone ?? '',
      shipping_address: input.shippingAddress ?? '',
      shipping_postal_code: input.shippingPostalCode ?? '',
      shipping_memo: input.shippingMemo ?? '',
      is_anonymous: input.isAnonymous ?? false,
      supporter_message: input.supporterMessage ?? '',
      message_public: input.messagePublic ?? false,
      agreed_terms: input.agreedTerms,
      agreed_privacy: input.agreedPrivacy,
      agreed_withdrawal_waiver: input.agreedWithdrawalWaiver ?? false,
      user_agent: hdrs.get('user-agent') ?? null,
      ip_hash: await hashIp(ip),
    },
  });

  const r = data as { ok: boolean; code?: string; order_no?: string; amount?: number } | null;
  if (error || !r) return { ok: false, code: 'INTERNAL_ERROR' };
  if (!r.ok) {
    if (r.code === 'PROJECT_CLOSED' || r.code === 'PROJECT_NOT_FOUND')
      return { ok: false, code: 'PROJECT_CLOSED' };
    if (r.code === 'TIER_SOLD_OUT' || r.code === 'TIER_NOT_FOUND')
      return { ok: false, code: 'TIER_SOLD_OUT' };
    return { ok: false, code: 'INVALID_INPUT' };
  }
  return { ok: true, orderNo: r.order_no!, amount: r.amount! };
}
```

> 구현 주의: `hashIp` 실제 경로/시그니처는 Step 0에서 petition 코드로 확인([lib/petition](../../../lib/petition/) 또는 RPC `hash_ip`). `checkRateLimit` 시그니처도 [lib/rate-limit.ts](../../../lib/rate-limit.ts)에서 확인해 인자 순서를 맞춘다. 테스트는 mock이라 통과하지만 실제 경로 불일치 시 런타임 오류.

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/actions/funding.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add app/actions/funding.ts __tests__/actions/funding.test.ts
git commit -m "feat(funding): add createPledge server action (validation, rate limit, RPC)

요약: 후원 생성 서버액션 — 입력검증·IP rate limit·create_funding_pledge 호출"
```

---

### Task 7: 후원 결제 confirm route

**Files:**

- Create: `app/api/payments/funding/toss/confirm/route.ts`
- Test: `__tests__/app/funding-confirm.test.ts`

**Interfaces:**

- Consumes: `confirmPayment`/`cancelPayment`([lib/integrations/toss](../../../lib/integrations/toss/)), RPC `confirm_funding_pledge`(Task 4), `funding_payments` insert.
- Produces: `POST` 핸들러 — body `{ paymentKey, orderId, amount }`. event confirm route 미러.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
/** @jest-environment node */
import { POST } from '@/app/api/payments/funding/toss/confirm/route';

jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));
jest.mock('@/lib/integrations/toss/confirm', () => ({ confirmPayment: jest.fn() }));
jest.mock('@/lib/integrations/toss/cancel', () => ({ cancelPayment: jest.fn() }));

const { createSupabaseAdminClient } = require('@/lib/auth/server');
const { confirmPayment } = require('@/lib/integrations/toss/confirm');

function req(body: unknown) {
  return new Request('http://t/confirm', { method: 'POST', body: JSON.stringify(body) }) as any;
}

beforeEach(() => jest.clearAllMocks());

it('rejects when pledge not found', async () => {
  createSupabaseAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: { message: 'x' } }) }) }),
    }),
  });
  const res = await POST(req({ paymentKey: 'pk', orderId: 'FND-1', amount: 30000 }));
  expect(res.status).toBe(404);
});

it('returns alreadyPaid when pledge already paid', async () => {
  createSupabaseAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: { id: 'p1', total_amount: 30000, status: 'paid', order_no: 'FND-1' },
            error: null,
          }),
        }),
      }),
    }),
  });
  const res = await POST(req({ paymentKey: 'pk', orderId: 'FND-1', amount: 30000 }));
  const json = await res.json();
  expect(json.alreadyPaid).toBe(true);
});

it('rejects amount mismatch with 400', async () => {
  createSupabaseAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: { id: 'p1', total_amount: 30000, status: 'pending_payment', order_no: 'FND-1' },
            error: null,
          }),
        }),
      }),
    }),
  });
  const res = await POST(req({ paymentKey: 'pk', orderId: 'FND-1', amount: 999 }));
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/app/funding-confirm.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현** (event confirm route 미러; 자동환불·funding_payments insert 포함)

```typescript
import { NextRequest, NextResponse, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { notifyEmail } from '@/lib/notify';
import { runAllSettled } from '@/lib/server/after-response';

/** 후원 결제 confirm. 토스 승인 → confirm_funding_pledge → 실패 시 자동환불 → 알림. */
export async function POST(req: NextRequest) {
  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || typeof amount !== 'number') {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: pledge, error: pErr } = await supabase
    .from('funding_pledges')
    .select(
      'id, backer_name, backer_email, backer_phone, total_amount, status, order_no, project_id'
    )
    .eq('order_no', orderId)
    .single();
  if (pErr || !pledge) {
    return NextResponse.json({ error: 'pledge_not_found' }, { status: 404 });
  }
  if (pledge.total_amount !== amount) {
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
  }
  if (pledge.status === 'paid') {
    return NextResponse.json({ success: true, alreadyPaid: true });
  }
  if (pledge.status !== 'pending_payment') {
    return NextResponse.json({ error: 'invalid_pledge_status' }, { status: 409 });
  }

  const confirmResult = await confirmPayment(
    { paymentKey, orderId, amount },
    `fnd-confirm-${orderId}`,
    'domestic'
  );
  if (!confirmResult.success) {
    after(() =>
      notifyEmail('error', '후원 결제 승인 실패', {
        주문번호: orderId,
        에러: confirmResult.error.message ?? '',
      })
    );
    return NextResponse.json({ error: 'payment_confirmation_failed' }, { status: 400 });
  }
  const toss = confirmResult.data;
  if (toss.status !== 'DONE') {
    // 1차는 카드 즉시결제만. 가상계좌 등 비-DONE은 미지원.
    after(() =>
      notifyEmail('warning', '후원 비-DONE 결제 상태(미확정)', {
        주문번호: orderId,
        status: toss.status,
      })
    );
    return NextResponse.json({ error: 'unsupported_payment_status' }, { status: 400 });
  }

  const { data: confirmData, error: confErr } = await supabase.rpc('confirm_funding_pledge', {
    p_order_no: orderId,
    p_payment_key: toss.paymentKey,
    p_amount: amount,
  });
  const c = confirmData as { ok: boolean; code?: string } | null;

  if (confErr || !c?.ok) {
    // 승인됐으나 확정 실패 → 자동 환불
    const reason =
      c?.code === 'TIER_SOLD_OUT' ? '한정 리워드 소진 - 자동 환불' : '후원 확정 실패 - 자동 환불';
    let refunded = false;
    try {
      const cancelResult = await cancelPayment(
        toss.paymentKey,
        { cancelReason: reason },
        `fnd-refund-${orderId}`,
        'domestic'
      );
      refunded = cancelResult.success;
      if (!cancelResult.success) {
        after(() =>
          notifyEmail('error', '후원 자동환불 실패(수동확인)', {
            주문번호: orderId,
            결제키: toss.paymentKey,
            에러: cancelResult.error.message || cancelResult.error.code,
          })
        );
      }
    } catch (e) {
      console.error('[funding-confirm] auto-refund failed:', e);
      after(() =>
        notifyEmail('error', '후원 자동환불 실패(수동확인)', {
          주문번호: orderId,
          결제키: toss.paymentKey,
        })
      );
    }
    await supabase
      .from('funding_pledges')
      .update({
        status: refunded ? 'cancelled' : 'expired',
        cancelled_at: new Date().toISOString(),
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('order_no', orderId);
    return NextResponse.json(
      {
        error: refunded
          ? c?.code === 'TIER_SOLD_OUT'
            ? 'sold_out_refunded'
            : 'confirm_failed_refunded'
          : 'auto_refund_failed',
      },
      { status: refunded ? 409 : 502 }
    );
  }

  // 결제 기록(funding_payments) — 멱등: idempotency_key UNIQUE 충돌 시 무시
  await supabase.from('funding_payments').insert({
    pledge_id: pledge.id,
    payment_key: toss.paymentKey,
    toss_order_id: orderId,
    method: toss.method ?? null,
    amount,
    status: toss.status,
    approved_at: new Date().toISOString(),
    confirm_response: toss as unknown as Record<string, unknown>,
    idempotency_key: `fnd-confirm-${orderId}`,
  });

  revalidatePath('/funding/oh-yoon-terracotta');
  revalidatePath('/en/funding/oh-yoon-terracotta');

  after(async () => {
    await runAllSettled('fundingConfirm.notifications', [
      () =>
        notifyEmail('payment', '후원 접수(결제완료)', {
          후원자: pledge.backer_name,
          금액: `${pledge.total_amount.toLocaleString('ko-KR')}원`,
          주문번호: orderId,
        }),
      // 구매자 이메일/SMS는 후속 Phase(약관·템플릿)에서 추가
    ]);
  });

  return NextResponse.json({ success: true });
}
```

> 주의: `funding_payments.insert` 멱등 — 동일 `idempotency_key` 재confirm 시 UNIQUE 위반(23505)이 난다. confirm RPC가 이미 `ALREADY_PAID`로 멱등하므로 재호출 경로는 status 분기에서 일찍 반환된다. webhook 백업(Task 8)과의 동시성은 RPC의 `status='pending_payment'` 가드가 막는다. insert 실패는 로그만(결제·확정은 이미 성공).

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/app/funding-confirm.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add app/api/payments/funding/toss/confirm/route.ts __tests__/app/funding-confirm.test.ts
git commit -m "feat(funding): add funding payment confirm route (event-route mirror, auto-refund)

요약: 후원 결제 confirm — 토스 승인·확정 RPC·실패시 자동환불·결제기록"
```

---

### Task 8: 후원 webhook route + 작품 webhook 격리

**Files:**

- Create: `app/api/webhooks/funding/toss/route.ts`
- Modify: `app/api/webhooks/toss/route.ts` (최상단에 `isFundingOrderId` 즉시 ack 분기 추가)
- Test: `__tests__/app/funding-webhook-isolation.test.ts`

**Interfaces:**

- Consumes: `isFundingOrderId`(Task 5), `confirm_funding_pledge`(Task 4), Toss webhook 검증([lib/integrations/toss/webhook.ts](../../../lib/integrations/toss/webhook.ts)).
- Produces: `POST` 핸들러(FND 전용). 작품 webhook은 FND 주문을 즉시 200 ack 후 무시.

- [ ] **Step 1: 격리 테스트 작성**

```typescript
/** @jest-environment node */
import { isFundingOrderId } from '@/lib/funding/order-id';

it('artwork webhook should ignore FND- orders (discriminator contract)', () => {
  // 작품 webhook 최상단 가드가 사용할 판별식 계약 고정
  expect(isFundingOrderId('FND-20260623-AAAA0000')).toBe(true);
  expect(isFundingOrderId('SAF-20260623-0001')).toBe(false);
});
```

- [ ] **Step 2: 작품 webhook에 격리 가드 추가**

[app/api/webhooks/toss/route.ts](../../../app/api/webhooks/toss/route.ts)에서 기존 `isEventOrderId` 즉시-ack 분기 바로 옆에 추가(파싱된 orderId 확보 직후):

```typescript
import { isFundingOrderId } from '@/lib/funding/order-id';
// ... orderId 파싱 후, isEventOrderId 가드와 동일 위치:
if (isFundingOrderId(orderId)) {
  // 펀딩 결제는 /api/webhooks/funding/toss 가 처리. 작품 webhook은 즉시 ack 후 무시.
  return NextResponse.json({ received: true }, { status: 200 });
}
```

- [ ] **Step 3: 후원 webhook route 작성** (PAYMENT_STATUS_CHANGED DONE 백업만; mutate 전 Toss 재조회)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { verifyWebhookRequest, parseWebhookPayload } from '@/lib/integrations/toss/webhook';
import { fetchPayment } from '@/lib/integrations/toss/confirm';
import { isFundingOrderId } from '@/lib/funding/order-id';

/** 후원 결제 webhook 백업. confirm route 실패 시 paid 승격 보정. mutate 전 Toss 재조회. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const verified = await verifyWebhookRequest(req, raw);
  if (!verified.ok) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });

  const event = parseWebhookPayload(raw);
  const orderId = event?.orderId ?? '';
  if (!isFundingOrderId(orderId)) {
    return NextResponse.json({ received: true }, { status: 200 }); // 펀딩 외 주문 무시
  }
  if (event?.eventType !== 'PAYMENT_STATUS_CHANGED') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 위·변조·순서역전 방어: Toss 재조회로 실제 상태 확인
  const fetched = await fetchPayment(event.paymentKey, 'domestic');
  if (!fetched.success || fetched.data.status !== 'DONE') {
    return NextResponse.json({ received: true }, { status: 200 });
  }
  const toss = fetched.data;

  const supabase = createSupabaseAdminClient();
  const { data: confirmData } = await supabase.rpc('confirm_funding_pledge', {
    p_order_no: orderId,
    p_payment_key: toss.paymentKey,
    p_amount: toss.totalAmount,
  });
  const c = confirmData as { ok: boolean; code?: string } | null;
  if (c?.ok && c.code === 'CONFIRMED') {
    await supabase.from('funding_payments').insert({
      pledge_id: null, // confirm RPC가 order_no로 갱신; pledge_id는 별도 조회 생략 시 null 허용 불가 → 아래 주의
      payment_key: toss.paymentKey,
      toss_order_id: orderId,
      amount: toss.totalAmount,
      status: toss.status,
      approved_at: new Date().toISOString(),
      idempotency_key: `fnd-webhook-${toss.paymentKey}`,
    });
  }
  return NextResponse.json({ received: true }, { status: 200 });
}
```

> 주의: `funding_payments.pledge_id`는 NOT NULL이다. webhook insert 전에 `funding_pledges`에서 `order_no=orderId`로 `id`를 조회해 채운다(위 스니펫의 `pledge_id: null`을 실제 조회값으로 교체). `idempotency_key` UNIQUE 충돌(중복 webhook) 시 insert는 무시(에러 로그만).

- [ ] **Step 4: 통과 확인 + 회귀 확인**

Run: `npx jest __tests__/app/funding-webhook-isolation.test.ts __tests__/app/toss-webhook`
Expected: PASS — 격리 계약 + 기존 작품 webhook 테스트 무회귀.

- [ ] **Step 5: 커밋**

```bash
git add app/api/webhooks/funding/toss/route.ts app/api/webhooks/toss/route.ts __tests__/app/funding-webhook-isolation.test.ts
git commit -m "feat(funding): add funding webhook + isolate FND- from artwork webhook

요약: 후원 webhook 백업 + 작품 webhook의 FND 격리(거짓알림 폭주 방지)"
```

---

### Task 9: 백엔드 코어 통합 검증

**Files:** 없음(검증)

- [ ] **Step 1: 전체 펀딩 테스트**

Run: `npx jest __tests__/lib/funding __tests__/actions/funding.test.ts __tests__/app/funding`
Expected: 전부 PASS.

- [ ] **Step 2: 결제 회귀 확인**

Run: `npx jest __tests__/app/toss-confirm __tests__/app/toss-webhook __tests__/actions/checkout.test.ts`
Expected: 작품·이벤트 결제 테스트 무회귀.

- [ ] **Step 3: 타입체크 + 린트**

Run: `npm run type-check && npm run lint`
Expected: 통과.

- [ ] **Step 4: 마이그레이션 적용 목록 확인**

Run: `supabase migration list --linked | tail -8`
Expected: `20260623120000`~`20260623120300` 4건 적용 확인.

---

## 후속 Phase (별도 plan)

- **Phase B — 공개 펀딩 페이지**: `/funding/[slug]` (PageHero·진행률·티어카드·후원 플로우·success window.location.search·후원자 명단 집계 view), 청원 연결, e2e-a11y spec.
- **Phase C — Admin**: `/admin/funding` 개설·티어 CRUD·후원자/배송 관리·Toss 취소 환불.
- **Phase D — 알림·약관·법무 고지**: 구매자 이메일/SMS, 약관 체크리스트 UI, "기부금영수증 불가"·Keep-it-All·목적불능 전용 조항, 청약철회 동의.
- **Phase E — 운영 cron**: 만료 pledge 위생 cleanup, end_at 자동 close, reconcile.
- **선행 운영 과제(코드 외)**: 통신판매업 신고, 토스 정산분리 문의, 약관 법무검토.

## Self-Review 메모

- **Spec 커버리지**: 데이터 모델(§4)·동시성(§5)·결제흐름(§6)은 Task 1~8이 구현. UI(§7)·알림(§8)·약관(§9)은 후속 Phase로 명시 분리. 롤아웃(§10) 1~2단계가 본 plan.
- **auth.role() 가드**: 모든 신규 RPC(Task 2·3·4)에 적용 — Global Constraints 강제.
- **타입 일관성**: `create_funding_pledge`→`createPledge`→confirm route가 `order_no`/`total_amount`/`status` 동일 명칭 사용.
- **알려진 보완점(구현 중 확정)**: `hashIp` 경로(Task 6), `fetchPayment`/`verifyWebhookRequest` 시그니처(Task 8), `funding_payments.pledge_id` webhook 조회(Task 8 주의 박스) — 각 Task에 명시.
