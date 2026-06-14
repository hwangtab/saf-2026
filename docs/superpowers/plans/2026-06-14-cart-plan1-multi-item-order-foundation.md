# 다품목 주문 기반 (Cart 계획 1/2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 단건 결제 동작을 100% 보존하면서 주문·결제 파이프라인을 다품목(N개 작품) 처리 가능하게 확장한다.

**Architecture:** `orders`는 헤더(합계)로 유지하고 품목 상세를 신규 `order_items` 테이블로 정규화한다. 재고 RPC·`createOrder`·Toss confirm 라우트를 `order_items` 기준으로 동작하도록 바꾼다. 기존 단건 호출자는 `items` 1개짜리로 자동 정규화되어 코드·동작이 변하지 않는다.

**Tech Stack:** Next.js 16 Server Actions, Supabase(Postgres + RPC), Toss Payments SDK v2, Jest(Supabase 모킹).

**선행 조건:** 브랜치 `feat/shopping-cart` (이미 생성됨). 설계 스펙: `docs/superpowers/specs/2026-06-14-shopping-cart-design.md`.

**이 계획의 비범위:** 장바구니 상태관리/UI/`cart_items`/`/cart`·`/checkout` 페이지는 **계획 2**에서 다룬다. 본 계획은 백엔드 주문 기반만 만든다. 작업 완료 후에도 사용자 노출 동작은 기존 단건 결제와 동일(회귀 없음)해야 한다.

---

## File Structure

| 구분 | 경로                                                                        | 책임                                                                           |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 신규 | `supabase/migrations/20260614120000_order_items.sql`                        | `order_items` 테이블 + 기존 주문 백필                                          |
| 신규 | `supabase/migrations/20260614121000_check_availability_via_order_items.sql` | 재고 RPC를 `order_items` 조인 기준으로 변경                                    |
| 신규 | `lib/orders/normalize-items.ts`                                             | `createOrder` 입력 → 정규화된 `OrderItemInput[]` (순수 함수, 단위 테스트 대상) |
| 수정 | `types/index.ts`                                                            | `Order`에 `items?: OrderItem[]`, 신규 `OrderItem` 타입                         |
| 수정 | `app/actions/checkout.ts`                                                   | `createOrder`가 `items[]` 수용 + `order_items` INSERT                          |
| 수정 | `app/api/payments/toss/confirm/route.ts`                                    | 다품목 재확인 + `artwork_sales` N행 + 상태동기화 루프                          |
| 수정 | `lib/utils/get-order-notification-info.ts`                                  | 다품목 주문 알림 정보(대표작품 + "외 N건")                                     |
| 신규 | `__tests__/lib/orders/normalize-items.test.ts`                              | 정규화 순수함수 테스트                                                         |
| 수정 | `__tests__/actions/checkout.test.ts`                                        | 다품목 createOrder 케이스 추가                                                 |

---

## Task 1: `order_items` 테이블 마이그레이션 + 백필

**Files:**

- Create: `supabase/migrations/20260614120000_order_items.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- Migration: order_items — 주문 다품목화. orders는 헤더(합계)로 유지하고
-- 품목 상세(작품·수량·시점가격)를 정규화. 기존 단건 주문은 1행씩 백필.

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_artwork_id ON public.order_items(artwork_id);

-- RLS: 본인 주문의 품목만 조회. service_role은 우회.
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own order items" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.buyer_user_id IS NOT NULL
        AND o.buyer_user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO service_role;

-- 백필: 기존 주문 1건당 order_items 1행. unit_price는 item_amount/quantity.
INSERT INTO public.order_items (order_id, artwork_id, quantity, unit_price, created_at)
SELECT o.id, o.artwork_id, o.quantity,
       (o.item_amount / GREATEST(o.quantity, 1))::integer,
       o.created_at
FROM public.orders o
WHERE o.artwork_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id);
```

- [ ] **Step 2: 백필 정합성 자가검증 쿼리 준비 (실행은 적용 후)**

적용 후 검증할 쿼리를 주석으로 남겨둔다 (마이그레이션 파일 하단):

```sql
-- 적용 후 수동 검증 (MCP execute_sql, 읽기전용):
--   SELECT count(*) FROM orders WHERE artwork_id IS NOT NULL;            -- A
--   SELECT count(DISTINCT order_id) FROM order_items;                    -- A와 동일해야 함
--   SELECT o.id FROM orders o WHERE o.artwork_id IS NOT NULL
--     AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id=o.id); -- 0행이어야 함
```

- [ ] **Step 3: 커밋 (적용은 Task 2 RPC와 함께 사용자 컨펌 하에 MCP `apply_migration`)**

```bash
git add supabase/migrations/20260614120000_order_items.sql
git commit -m "feat(orders): add order_items table + backfill migration

요약: 주문 다품목화용 order_items 테이블 추가, 기존 주문 백필"
```

> ⚠️ **적용 주의:** MCP `apply_migration` 단건 사용. CLI `supabase db push` 금지(pending 일괄 적용 사고 위험 — CLAUDE.md). 적용 전 사용자 컨펌 필수.

---

## Task 2: 재고 RPC를 `order_items` 기준으로 변경

기존 RPC는 `orders.artwork_id = p_artwork_id`로 pending을 센다. 다품목 주문은 `orders.artwork_id`가 NULL이므로 `order_items` 조인으로 바꾼다. 백필 덕분에 단건 주문도 동일하게 동작한다.

**Files:**

- Create: `supabase/migrations/20260614121000_check_availability_via_order_items.sql`

- [ ] **Step 1: RPC 재정의 SQL 작성** (기존 [20260529190000](../../../supabase/migrations/20260529190000_check_artwork_availability_reserved_unique_only.sql) 본문에서 pending 카운트 블록만 교체)

```sql
-- Migration: check_artwork_availability의 pending 카운트를 order_items 조인 기준으로 변경.
-- 다품목 주문은 orders.artwork_id가 NULL이므로 order_items에서 작품별 수량을 합산해야 한다.
-- 단건 주문도 20260614120000 백필로 order_items 1행을 가지므로 동일하게 집계된다.

CREATE OR REPLACE FUNCTION public.check_artwork_availability(
  p_artwork_id uuid,
  p_exclude_order_id uuid DEFAULT NULL
)
RETURNS TABLE(
  is_available boolean,
  artwork_edition_type text,
  artwork_edition_limit integer,
  sold_count bigint,
  pending_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_artwork RECORD;
  v_sold_count bigint;
  v_pending_count bigint;
BEGIN
  SELECT a.edition_type::text, a.edition_limit, a.status
  INTO v_artwork
  FROM public.artworks a
  WHERE a.id = p_artwork_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::integer, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(s.quantity), 0)
  INTO v_sold_count
  FROM public.artwork_sales s
  WHERE s.artwork_id = p_artwork_id
    AND s.voided_at IS NULL;

  -- 변경점: orders.artwork_id 직접 비교 → order_items 조인 + 수량 합산.
  SELECT COALESCE(SUM(oi.quantity), 0)
  INTO v_pending_count
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE oi.artwork_id = p_artwork_id
    AND (p_exclude_order_id IS NULL OR o.id <> p_exclude_order_id)
    AND (
      (o.status = 'pending_payment' AND o.created_at > now() - interval '30 minutes')
      OR
      (o.status = 'awaiting_deposit' AND o.created_at > now() - interval '24 hours')
    );

  RETURN QUERY SELECT
    CASE
      WHEN v_artwork.status = 'sold' THEN false
      WHEN v_artwork.status = 'reserved' AND v_artwork.edition_type = 'unique' THEN false
      WHEN v_artwork.edition_type = 'unique'
        AND (v_sold_count + v_pending_count) >= 1 THEN false
      WHEN v_artwork.edition_type = 'limited'
        AND v_artwork.edition_limit IS NOT NULL
        AND (v_sold_count + v_pending_count) >= v_artwork.edition_limit THEN false
      ELSE true
    END,
    v_artwork.edition_type,
    v_artwork.edition_limit,
    v_sold_count,
    v_pending_count;
END;
$function$;
```

- [ ] **Step 2: 적용 후 회귀 검증 쿼리 준비** (파일 하단 주석)

```sql
-- 적용 후 검증: 기존 unique 작품(미판매) 1건 골라 RPC 호출 → is_available=true 확인.
--   SELECT * FROM check_artwork_availability('<available_unique_artwork_id>');
```

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260614121000_check_availability_via_order_items.sql
git commit -m "feat(orders): count pending availability via order_items join

요약: 재고 확인 RPC를 order_items 조인 기준으로 변경 (다품목 대응)"
```

- [ ] **Step 4: Task 1·2 마이그레이션 MCP 적용 (사용자 컨펌)**

`mcp__claude_ai_Supabase__apply_migration`으로 `20260614120000` → `20260614121000` 순서대로 단건 적용. 각 적용 후 Step 2 검증 쿼리 실행. 이후 `mcp__claude_ai_Supabase__generate_typescript_types`로 `types/supabase.ts` 갱신.

---

## Task 3: 입력 정규화 순수함수 + 타입

`createOrder`가 단건/다건을 모두 받도록, 입력을 `OrderItemInput[]`로 정규화하는 순수 함수를 먼저 TDD로 만든다.

**Files:**

- Create: `lib/orders/normalize-items.ts`
- Create: `__tests__/lib/orders/normalize-items.test.ts`
- Modify: `types/index.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// __tests__/lib/orders/normalize-items.test.ts
import { normalizeOrderItems } from '@/lib/orders/normalize-items';

describe('normalizeOrderItems', () => {
  it('단건(artworkId만)을 1개짜리 items로 변환', () => {
    expect(normalizeOrderItems({ artworkId: 'a1' })).toEqual([{ artworkId: 'a1', quantity: 1 }]);
  });

  it('items 배열을 그대로 정규화하고 quantity 기본값 1을 채운다', () => {
    expect(
      normalizeOrderItems({ items: [{ artworkId: 'a1', quantity: 2 }, { artworkId: 'a2' }] })
    ).toEqual([
      { artworkId: 'a1', quantity: 2 },
      { artworkId: 'a2', quantity: 1 },
    ]);
  });

  it('동일 artworkId 중복 항목은 수량을 합산한다', () => {
    expect(
      normalizeOrderItems({
        items: [
          { artworkId: 'a1', quantity: 1 },
          { artworkId: 'a1', quantity: 2 },
        ],
      })
    ).toEqual([{ artworkId: 'a1', quantity: 3 }]);
  });

  it('빈 입력은 빈 배열', () => {
    expect(normalizeOrderItems({ items: [] })).toEqual([]);
    expect(normalizeOrderItems({})).toEqual([]);
  });

  it('quantity가 0 이하면 1로 보정', () => {
    expect(normalizeOrderItems({ items: [{ artworkId: 'a1', quantity: 0 }] })).toEqual([
      { artworkId: 'a1', quantity: 1 },
    ]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- normalize-items`
Expected: FAIL — "Cannot find module '@/lib/orders/normalize-items'"

- [ ] **Step 3: 최소 구현**

```typescript
// lib/orders/normalize-items.ts
export type OrderItemInput = { artworkId: string; quantity: number };

type NormalizeInput = {
  artworkId?: string;
  items?: Array<{ artworkId: string; quantity?: number }>;
};

/**
 * createOrder 입력을 정규화된 OrderItemInput[]로 변환한다.
 * - 단건(artworkId)과 다건(items)을 통일
 * - 동일 작품 중복은 수량 합산
 * - quantity는 최소 1로 보정 (unique 강제는 서버 재고 검증 단계에서 처리)
 */
export function normalizeOrderItems(input: NormalizeInput): OrderItemInput[] {
  const raw: Array<{ artworkId: string; quantity?: number }> = input.items
    ? input.items
    : input.artworkId
      ? [{ artworkId: input.artworkId, quantity: 1 }]
      : [];

  const merged = new Map<string, number>();
  for (const { artworkId, quantity } of raw) {
    if (!artworkId) continue;
    const qty = Math.max(1, Math.floor(quantity ?? 1));
    merged.set(artworkId, (merged.get(artworkId) ?? 0) + qty);
  }
  return [...merged.entries()].map(([artworkId, quantity]) => ({ artworkId, quantity }));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- normalize-items`
Expected: PASS (5 tests)

- [ ] **Step 5: 타입 추가** — `types/index.ts`에 추가

```typescript
export interface OrderItem {
  id: string;
  order_id: string;
  artwork_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}
```

그리고 기존 `Order` 인터페이스에 `items?: OrderItem[];` 필드를 추가한다.

- [ ] **Step 6: type-check + 커밋**

Run: `npm run type-check`
Expected: 에러 없음

```bash
git add lib/orders/normalize-items.ts __tests__/lib/orders/normalize-items.test.ts types/index.ts
git commit -m "feat(orders): add order item normalization + OrderItem type

요약: 주문 입력 단건/다건 정규화 순수함수와 OrderItem 타입 추가"
```

---

## Task 4: `createOrder`를 items[] 수용 + `order_items` INSERT로 리팩터

기존 동작 보존이 핵심. 단건 호출(`{ artworkId, ...buyer }`)은 결과·부수효과가 동일해야 한다. 다건은 `orders.artwork_id = null`로 두고 `order_items`에 품목을 쓴다.

**Files:**

- Modify: `app/actions/checkout.ts:40-52` (`CreateOrderInput`), `:173-394` (`createOrder`)
- Modify: `__tests__/actions/checkout.test.ts`

- [ ] **Step 1: `CreateOrderInput`에 items 추가** ([checkout.ts:40](../../../app/actions/checkout.ts#L40))

```typescript
export type CreateOrderInput = {
  artworkId?: string; // 단건(바로구매) 호환. items와 동시 사용 시 items 우선
  items?: Array<{ artworkId: string; quantity?: number }>;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingAddressDetail?: string;
  shippingPostalCode: string;
  shippingMemo?: string;
  locale?: 'ko' | 'en';
};
```

- [ ] **Step 2: createOrder 도입부 — 정규화 + 다품목 작품 조회/검증**

[checkout.ts:198-299](../../../app/actions/checkout.ts#L198) 의 단건 검증·조회 블록을 다음으로 교체한다. (`import { normalizeOrderItems } from '@/lib/orders/normalize-items';` 추가)

```typescript
// artworkId/items 통일
const orderItems = normalizeOrderItems({ artworkId: input.artworkId, items: input.items });
if (orderItems.length === 0) {
  return { success: false, error: apiError('required_buyer_info', buyerLocale) };
}
if (!buyerName || !buyerEmail || !buyerPhone) {
  return { success: false, error: apiError('required_buyer_info', buyerLocale) };
}
if (!shippingAddress || !shippingPostalCode) {
  return { success: false, error: apiError('required_shipping_info', buyerLocale) };
}
// (길이/형식 검증 블록은 기존 그대로 유지 — buyerName/email/phone/postal)

const adminClient = createSupabaseAdminClient();

// 작품 일괄 조회
const artworkIds = orderItems.map((i) => i.artworkId);
const { data: artworks, error: artworkError } = await adminClient
  .from('artworks')
  .select('id, title, price, status, edition_type, artists(name_ko)')
  .in('id', artworkIds)
  .eq('is_hidden', false);

if (artworkError || !artworks || artworks.length !== artworkIds.length) {
  return { success: false, error: apiError('artwork_not_found', buyerLocale) };
}
const artworkById = new Map(artworks.map((a) => [a.id, a]));

// 동일 구매자의 오래된 pending_payment 주문 정리 (작품별)
const cleanupCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
await adminClient.rpc('cancel_stale_buyer_pending_orders', {
  p_artwork_ids: artworkIds,
  p_buyer_email: buyerEmailNorm,
  p_cutoff: cleanupCutoff,
}); // 주: 단순화를 위해 기존 per-artwork UPDATE 루프를 써도 무방(아래 대안 참고)

// 품목별 재고 재확인 — 품절 항목 수집(정책 4: 부분 차단)
const unavailable: string[] = [];
let itemAmount = 0;
const itemRows: Array<{ artwork_id: string; quantity: number; unit_price: number }> = [];
for (const { artworkId, quantity } of orderItems) {
  const art = artworkById.get(artworkId)!;
  const isUnique = art.edition_type === 'unique';
  const qty = isUnique ? 1 : quantity; // unique 강제
  const { data: availResult } = await adminClient.rpc('check_artwork_availability', {
    p_artwork_id: artworkId,
  });
  const ok = Array.isArray(availResult) && availResult[0]?.is_available === true;
  const unitPrice = parsePrice(art.price);
  if (!ok || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    unavailable.push(artworkId);
    continue;
  }
  itemAmount += unitPrice * qty;
  itemRows.push({ artwork_id: artworkId, quantity: qty, unit_price: unitPrice });
}

if (unavailable.length > 0) {
  // 품절 항목을 클라이언트에 알려 사용자가 제거 후 재시도 (정책 4)
  return { success: false, error: apiError('artwork_sold_out', buyerLocale), unavailable };
}

const shippingAmount = calculateShippingFee(itemAmount); // 정책 3: 합산 1회
const totalAmount = itemAmount + shippingAmount;

// orderName: 단건은 "제목 (작가)", 다건은 "제목 외 N건"
const firstArt = artworkById.get(itemRows[0].artwork_id)!;
const firstArtistRow = firstArt.artists as { name_ko: string } | { name_ko: string }[] | null;
const firstArtist = Array.isArray(firstArtistRow)
  ? (firstArtistRow[0]?.name_ko ?? 'Unknown Artist')
  : (firstArtistRow?.name_ko ?? 'Unknown Artist');
const orderName =
  itemRows.length === 1
    ? `${firstArt.title} (${firstArtist})`
    : `${firstArt.title} 외 ${itemRows.length - 1}건`;
```

> **대안(권장, RPC 안 만들고 싶으면):** `cancel_stale_buyer_pending_orders` RPC 대신 기존 패턴([checkout.ts:262-269](../../../app/actions/checkout.ts#L262))을 `for (const id of artworkIds)` 루프로 감싸 per-artwork UPDATE. 구현자는 둘 중 하나 선택, 단 다건일 때 모든 작품에 적용되도록 할 것.

- [ ] **Step 3: `CreateOrderResult`에 unavailable 추가** ([checkout.ts:54](../../../app/actions/checkout.ts#L54))

```typescript
export type CreateOrderResult =
  | {
      success: true;
      orderId: string;
      orderNo: string;
      totalAmount: number;
      orderName: string;
      checkoutToken: string;
    }
  | { success: false; error: string; unavailable?: string[] };
```

- [ ] **Step 4: orders INSERT를 다품목화 + order_items INSERT**

[checkout.ts:328-377](../../../app/actions/checkout.ts#L328) INSERT 루프에서 `artwork_id`/`quantity`를 다음 규칙으로 바꾼다:

- 단건(`itemRows.length === 1`): `artwork_id: itemRows[0].artwork_id`, `quantity: itemRows[0].quantity` — **기존과 동일**(백필·RPC 호환)
- 다건: `artwork_id: null`, `quantity: itemRows.reduce((s,i)=>s+i.quantity,0)`

주문 INSERT 성공 직후, `order.id`로 `order_items`를 일괄 INSERT한다:

```typescript
const { error: itemsInsertError } = await adminClient.from('order_items').insert(
  itemRows.map((r) => ({
    order_id: order.id,
    artwork_id: r.artwork_id,
    quantity: r.quantity,
    unit_price: r.unit_price,
  }))
);
if (itemsInsertError) {
  // 주문 헤더만 있고 품목이 없으면 재고/정산이 깨짐 — 주문 롤백 후 실패 반환
  await adminClient.from('orders').delete().eq('id', order.id);
  return { success: false, error: apiError('order_creation_failed', buyerLocale) };
}
```

`rememberCheckoutCookie` 호출의 첫 인자(artworkId)는 단건이면 그 작품, 다건이면 `order.id` 기반 키로 둔다. 다건 쿠키 키 함수 `latestCheckoutCookieName`은 단건 바로구매 전용이므로, 다건일 때는 `rememberCheckoutCookie` 대신 주문별 쿠키(`checkoutCookieName(orderNo)`)만 설정하도록 분기한다.

- [ ] **Step 5: 다품목 createOrder 단위 테스트 추가** — `__tests__/actions/checkout.test.ts`에 기존 모킹 패턴으로 케이스 추가

```typescript
it('items 2건 주문 시 order_items 2행 INSERT + total은 합산+배송', async () => {
  // mockArtworkResult: .in() 조회가 2건 반환하도록 모킹
  // mockRpcResult: 각 작품 available=true
  // mockInsertResultsQueue: [order insert success, order_items insert success]
  // 기대: result.success === true, totalAmount === price1*q1 + price2*q2 + shipping
});

it('items 중 1건이 품절이면 success:false + unavailable에 해당 id 포함', async () => {
  // 한 작품의 RPC available=false
  // 기대: result.success === false, result.unavailable === ['a2']
});

it('단건(artworkId) 호출은 기존과 동일하게 동작', async () => {
  // 기존 단건 테스트가 그대로 green인지 확인 (회귀 가드)
});
```

> 구현자 주의: 기존 테스트의 `mockInsertResultsQueue` 사용법을 따라 order INSERT 다음에 order_items INSERT 결과를 큐에 추가할 것. `.in()` 모킹이 없으면 Supabase 모킹 객체에 `in` 체이너를 추가한다.

- [ ] **Step 6: 테스트 + type-check + 커밋**

Run: `npm test -- checkout && npm run type-check`
Expected: 기존 + 신규 테스트 모두 PASS

```bash
git add app/actions/checkout.ts __tests__/actions/checkout.test.ts
git commit -m "feat(checkout): createOrder accepts items[] and writes order_items

요약: createOrder 다품목 지원 — order_items 기록, 부분품절 시 unavailable 반환, 단건 동작 보존"
```

---

## Task 5: confirm 라우트 — 다품목 재확인

confirm 라우트가 `order.artwork_id` 단일 가정을 버리고 `order_items` 전체를 검증·반영하게 한다. 단건 주문은 `order_items` 1행이라 동작 동일.

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts:111-189` (주문 조회 + 재확인)

- [ ] **Step 1: 주문 조회에 order_items 포함** ([confirm/route.ts:111](../../../app/api/payments/toss/confirm/route.ts#L111))

```typescript
const { data: order, error: orderError } = await supabase
  .from('orders')
  .select(
    'id, total_amount, status, artwork_id, order_no, buyer_name, buyer_phone, buyer_email, metadata, order_items(artwork_id, quantity, unit_price)'
  )
  .eq('order_no', orderId)
  .single();
```

- [ ] **Step 2: 재확인을 order_items 루프로 변경** ([confirm/route.ts:172-189](../../../app/api/payments/toss/confirm/route.ts#L172))

기존 `if (order.artwork_id) { ...단일 RPC... }` 블록을 다음으로 교체:

```typescript
const lineItems =
  (order.order_items as Array<{ artwork_id: string; quantity: number; unit_price: number }>) ?? [];

for (const item of lineItems) {
  const { data: availResult, error: availError } = await supabase.rpc(
    'check_artwork_availability',
    { p_artwork_id: item.artwork_id, p_exclude_order_id: order.id }
  );
  const isAvailable = Array.isArray(availResult) && availResult[0]?.is_available === true;
  if (availError || !isAvailable) {
    await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending_payment');
    return NextResponse.json({ error: apiError('artwork_sold_out', reqLocale) }, { status: 409 });
  }
}
```

- [ ] **Step 3: type-check (이 단계는 동작 변경이라 단위테스트보다 통합 — 빌드로 가드)**

Run: `npm run type-check`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/api/payments/toss/confirm/route.ts
git commit -m "feat(confirm): re-check availability per order_items line

요약: 결제 승인 직전 재확인을 order_items 전 품목 루프로 변경"
```

---

## Task 6: confirm 라우트 — 매출 N행 + 상태동기화 + 예약 루프

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts:278-361`

- [ ] **Step 1: 가상계좌 reserved 잠금을 unique 품목 루프로** ([confirm/route.ts:280-297](../../../app/api/payments/toss/confirm/route.ts#L280))

`order.artwork_id` 단일 처리 대신 `lineItems`를 돌며 각 작품의 edition_type을 확인하고 unique만 reserved 처리. 각 작품에 대해 `revalidatePath('/artworks/<id>')`(+`/en`) 호출.

```typescript
if (isVirtualAccount && updatedOrders && updatedOrders.length > 0) {
  for (const item of lineItems) {
    const { data: artworkEdition } = await supabase
      .from('artworks')
      .select('edition_type')
      .eq('id', item.artwork_id)
      .maybeSingle();
    if (artworkEdition?.edition_type === 'unique') {
      await supabase
        .from('artworks')
        .update({ status: 'reserved' })
        .eq('id', item.artwork_id)
        .eq('status', 'available');
      revalidatePath(`/artworks/${item.artwork_id}`);
      revalidatePath(`/en/artworks/${item.artwork_id}`);
    }
  }
  revalidatePublicArtworkSurfaces();
}
```

- [ ] **Step 2: artwork_sales를 품목별 N행 INSERT + 상태동기화 루프** ([confirm/route.ts:324-351](../../../app/api/payments/toss/confirm/route.ts#L324))

```typescript
if (isDone && updatedOrders && updatedOrders.length > 0) {
  const salesRows = lineItems.map((item) => ({
    artwork_id: item.artwork_id,
    sale_price: item.unit_price * item.quantity, // 라인 합계(배송 제외)
    quantity: item.quantity,
    source: 'toss' as const,
    source_detail: provider === 'widget' ? 'toss_widget' : 'toss_api',
    order_id: order.id,
    external_order_id: order.order_no,
    buyer_name: order.buyer_name,
    buyer_phone: order.buyer_phone,
    sold_at: new Date().toISOString(),
  }));
  const { error: salesInsertError } = await supabase.from('artwork_sales').insert(salesRows);
  if (salesInsertError) {
    console.error('[confirm] artwork_sales INSERT 실패:', salesInsertError);
    void notifyEmail('error', '결제 후 판매 기록 생성 실패', {
      주문번호: orderId,
      에러: salesInsertError.message,
      참고: '결제+주문 완료, 판매 기록 누락 — reconciliation cron 보정 예정',
    });
  }
  for (const item of lineItems) {
    await deriveAndSyncArtworkStatus(supabase, item.artwork_id);
  }
}
```

> ⚠️ `artwork_sales`에는 `20260421062624_add_artwork_sales_unique_active_per_order.sql`로 `(order_id, artwork_id)` 활성 유니크 제약이 있을 수 있다. 다품목은 order당 artwork별 1행이므로 제약과 호환된다. 적용 전 해당 마이그레이션을 읽어 제약 범위를 확인할 것.

- [ ] **Step 3: 결제완료 캐시 무효화도 품목 루프로** ([confirm/route.ts:357-361](../../../app/api/payments/toss/confirm/route.ts#L357))

`order.artwork_id` 단일 revalidate 대신 `lineItems.forEach`로 각 작품 경로 revalidate + `revalidatePublicArtworkSurfaces()` 1회.

- [ ] **Step 4: type-check + 커밋**

Run: `npm run type-check`
Expected: 에러 없음

```bash
git add app/api/payments/toss/confirm/route.ts
git commit -m "feat(confirm): record artwork_sales per line item + sync each artwork

요약: 결제완료 시 품목별 매출 N행 기록, 작품별 상태동기화·예약·캐시무효화 루프화"
```

---

## Task 7: 알림 정보 다품목 대응

`getOrderNotificationInfo`/`buildAnalyticsItem`이 단일 작품을 가정한다. 다건 주문에서 대표 작품 + "외 N건"으로 동작하게 한다. 단건은 기존 출력 유지.

**Files:**

- Modify: `lib/utils/get-order-notification-info.ts`
- Modify: `app/api/payments/toss/confirm/route.ts:61-74` (`buildAnalyticsItem`)

- [ ] **Step 1: 현재 구현 확인 후 다품목 분기 추가**

Run: `cat lib/utils/get-order-notification-info.ts` (구현자: 먼저 읽기)

`order_items`가 2건 이상이면 `artworkTitle`을 `"<대표작품> 외 N건"`으로, `itemAmount`는 전체 라인 합계로 집계한다. `analyticsItem`은 다건일 때 대표 작품 기준으로 만들되 `itemAmount`는 전체 합계로 채운다. (GA 다중상품 분해는 계획 2의 success 페이지에서 처리)

- [ ] **Step 2: 회귀 — 단건 알림 출력 불변 확인**

기존 알림 테스트가 있으면 실행, 없으면 단건 주문 모킹으로 `getOrderNotificationInfo`가 기존과 동일 필드를 반환하는지 단위 테스트 1개 추가.

Run: `npm test -- get-order-notification-info` (또는 관련 테스트)

- [ ] **Step 3: 커밋**

```bash
git add lib/utils/get-order-notification-info.ts app/api/payments/toss/confirm/route.ts
git commit -m "feat(notify): support multi-item orders in notification info

요약: 알림/분석 정보 다품목 대응 (대표작품 외 N건), 단건 출력 보존"
```

---

## Task 8: 전체 회귀 + 빌드 검증

**Files:** (없음 — 검증 전용)

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전 스위트 PASS (특히 `checkout`, `confirm`, `order-lookup`, `checkout-*-analytics`, `checkout-landing-client-search`)

- [ ] **Step 2: 타입·린트**

Run: `npm run type-check && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 프로덕션 빌드 (SSG 호환 확인 — CLAUDE.md)**

Run: `npm run build`
Expected: 성공

- [ ] **Step 4: 수동 회귀 — 단건 바로구매 (스테이징/프리뷰)**

기존 `/checkout/{artworkId}` 단건 결제를 테스트 카드로 1건 완주 → 주문 paid, `order_items` 1행, `artwork_sales` 1행, 작품 status 갱신, 알림 정상 확인. (verify 스킬 활용 가능)

- [ ] **Step 5: PR 생성 + 머지** (메모리: 커밋 후 push, PR이면 머지까지)

```bash
git push -u origin feat/shopping-cart
gh pr create --title "feat: 다품목 주문 기반 (장바구니 계획 1/2)" --body "..."
```

---

## Self-Review 메모 (계획 작성자 검증 완료)

- **스펙 커버리지:** 스펙 §2 `order_items`(Task1), §3 RPC·createOrder·confirm 다품목·pending 예약(Task2·4·5·6), 배송료 합산(Task4 Step2), unique 강제(Task4 Step2), 부분 차단(Task4 Step2·3). 스펙 §1·§4(상태관리/UI/`cart_items`/페이지)와 §5 i18n·a11y는 **계획 2**로 명시 이월.
- **타입 일관성:** `OrderItemInput`(normalize-items.ts), `OrderItem`(types), `order_items` 컬럼(artwork_id/quantity/unit_price)이 Task 전반에서 동일.
- **위험:** confirm 라우트는 단위 테스트 커버가 얕음 → Task8 Step4 수동 회귀로 보강. `artwork_sales` 유니크 제약은 적용 전 마이그레이션 원문 확인 필요(Task6 Step2 주석).
- **미해결 의존:** `cancel_stale_buyer_pending_orders` RPC는 선택(대안: per-artwork UPDATE 루프). 구현자가 택1.
