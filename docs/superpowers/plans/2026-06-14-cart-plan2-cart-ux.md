# 장바구니 UX (Cart 계획 2/2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작품을 장바구니에 담아 한 번에 여러 점을 결제할 수 있는 사용자 동선(상태·UI·다품목 결제)을 구현한다.

**Architecture:** 기존 `WishlistProvider` 구조(localStorage-first + `onAuthStateChange` 병합 + DB optimistic 동기화)를 미러한 `CartProvider`로 카트 상태를 관리한다. 단 wishlist의 숫자 id 검증 버그를 답습하지 않고 **uuid artwork id**를 저장해 Plan 1의 `createOrder(items[])` 백엔드와 직접 연결한다. UI는 헤더 아이콘+슬라이드 드로어 + `/cart` 페이지, 결제는 `/checkout`(다품목) 페이지가 기존 BuyerInfoForm·Toss 흐름을 재사용한다.

**Tech Stack:** Next.js 16(App Router), React Context, Supabase(`cart_items` 테이블 + RLS), next-intl, Toss Payments SDK v2, Jest, Playwright(a11y).

**선행 조건:** 계획 1(`feat/shopping-cart`, 다품목 주문 기반) 완료 — `order_items` 테이블, `createOrder` items[] 수용, confirm/webhook 다품목, 전환안전 RPC 모두 production 적용·머지 대기 상태. 설계 스펙: `docs/superpowers/specs/2026-06-14-shopping-cart-design.md`.

**미러 대상(읽고 패턴 복제):**

- `lib/wishlist.ts` → `lib/cart.ts` (localStorage util, **단 items는 `{artworkId, quantity}[]`**)
- `app/actions/mypage.ts`(wishlist 액션) → `app/actions/cart.ts` (**uuid 검증**)
- `components/providers/WishlistProvider.tsx` → `components/providers/CartProvider.tsx`
- `components/common/Header/WishlistNavButton.tsx` → `CartNavButton.tsx`
- `components/features/WishlistPageContent.tsx` + `app/[locale]/wishlist/page.tsx` → `/cart`
- `supabase/migrations/20260522000000_create_wishlists.sql` → `cart_items` (artwork_id **uuid**)

**확정 정책(스펙):** 로그인=DB·게스트=local·로그인 시 병합, unique는 수량 1 고정, 바로구매+담기 병행, 배송료 합산, 헤더 아이콘+드로어+`/cart`.

---

## File Structure

| 구분 | 경로                                                            | 책임                                                                 |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| 신규 | `supabase/migrations/20260614150000_create_cart_items.sql`      | `cart_items` 테이블(uuid artwork_id, quantity) + RLS                 |
| 신규 | `lib/cart/cart-storage.ts`                                      | localStorage 카트 util (items + quantity, unique=1)                  |
| 신규 | `app/actions/cart.ts`                                           | 카트 DB 서버액션(get/upsert/remove/bulkMerge/clear, uuid 검증)       |
| 신규 | `app/actions/cart-artworks.ts`                                  | 카트 표시용 작품 상세 일괄 조회(title/price/image/edition/available) |
| 신규 | `components/providers/CartProvider.tsx`                         | `useCart()` — 상태·병합·DB 동기화·드로어 open 상태                   |
| 신규 | `components/common/Header/CartNavButton.tsx`                    | 헤더 카트 아이콘 + 수량 배지 → 드로어 open                           |
| 신규 | `components/features/CartDrawer.tsx`                            | 우측 슬라이드 패널(목록·수량·삭제·소계·CTA)                          |
| 신규 | `components/features/AddToCartButton.tsx`                       | "장바구니 담기" 버튼(unique 처리)                                    |
| 신규 | `components/features/CartPageContent.tsx`                       | `/cart` 본문(목록·수량·삭제·비우기·결제)                             |
| 신규 | `app/[locale]/cart/page.tsx`                                    | `/cart` 페이지 셸(PageHero + CartPageContent)                        |
| 신규 | `app/[locale]/checkout/page.tsx`                                | 다품목 checkout 페이지 셸                                            |
| 신규 | `app/[locale]/checkout/CartCheckoutClient.tsx`                  | 다품목 결제 클라이언트(BuyerInfoForm·Toss·createOrder items[])       |
| 신규 | `e2e/a11y/cart.spec.ts`                                         | `/cart` a11y                                                         |
| 수정 | `components/features/ArtworkPurchaseCTA.tsx`                    | "바로 구매" 옆 "장바구니 담기" 추가                                  |
| 수정 | `components/common/Header/DesktopNav.tsx`, `FullscreenMenu.tsx` | CartNavButton 배치                                                   |
| 수정 | `app/[locale]/layout.tsx`                                       | `CartProvider`로 트리 래핑(WishlistProvider 인접)                    |
| 수정 | `messages/ko.json`, `messages/en.json`                          | `cart` 네임스페이스                                                  |
| 수정 | `types/index.ts`                                                | `CartItem`(클라이언트 카트 항목) 타입                                |

> **id 규약(중요):** 카트 전체가 **artwork uuid**를 쓴다(`artworks.id`). wishlist의 `isValidArtworkId = /^\d+$/`(숫자) 검증을 복사하지 말 것 — 그게 wishlist DB 동기화를 0행으로 죽인 버그다. 카트 검증은 uuid 정규식 사용.

---

## Task 1: `cart_items` 테이블 마이그레이션

**Files:**

- Create: `supabase/migrations/20260614150000_create_cart_items.sql`

- [ ] **Step 1: SQL 작성** (wishlists 미러 + quantity + uuid FK)

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';

-- 로그인 사용자 장바구니. 게스트는 localStorage, 로그인 시 병합되어 여기에 저장.
CREATE TABLE IF NOT EXISTS public.cart_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id  uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  quantity    integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, artwork_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 본인 카트만 CRUD (wishlists 정책 미러)
CREATE POLICY "Users can manage own cart"
  ON public.cart_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.cart_items IS '로그인 사용자 장바구니 — artwork_id(uuid) FK. 게스트는 localStorage.';

COMMIT;
```

- [ ] **Step 2: 커밋** (적용은 사용자 컨펌 후 MCP `apply_migration` — 본 계획 실행 중 컨트롤러가 처리)

```bash
git add supabase/migrations/20260614150000_create_cart_items.sql
git commit -m "feat(cart): add cart_items table with RLS

요약: 로그인 사용자 장바구니 cart_items 테이블(uuid artwork_id, quantity) 추가"
```

> ⚠️ 적용은 MCP `apply_migration` 단건(사용자 컨펌). 적용 후 `generate_typescript_types`로 `types/supabase.ts` 갱신.

---

## Task 2: localStorage 카트 util (TDD)

`lib/wishlist.ts`를 미러하되 항목이 `{ artworkId: string; quantity: number }`이고 unique 처리는 호출측(Provider)에서 quantity를 1로 넘긴다.

**Files:**

- Create: `lib/cart/cart-storage.ts`
- Create: `__tests__/lib/cart/cart-storage.test.ts`
- Modify: `types/index.ts` (`CartItem` 추가)

- [ ] **Step 1: 타입 추가** — `types/index.ts`

```typescript
/** 클라이언트 장바구니 항목(localStorage·CartProvider). artworkId는 artworks.id(uuid). */
export interface CartItem {
  artworkId: string;
  quantity: number;
}
```

- [ ] **Step 2: 실패 테스트 작성** — `__tests__/lib/cart/cart-storage.test.ts`

```typescript
import {
  getCart,
  setCartQuantity,
  removeFromCart,
  clearCart,
  cartCount,
} from '@/lib/cart/cart-storage';

beforeEach(() => window.localStorage.clear());

describe('cart-storage', () => {
  it('빈 카트는 []', () => {
    expect(getCart()).toEqual([]);
  });

  it('setCartQuantity로 신규 항목 추가', () => {
    expect(setCartQuantity('a1', 2)).toEqual([{ artworkId: 'a1', quantity: 2 }]);
    expect(getCart()).toEqual([{ artworkId: 'a1', quantity: 2 }]);
  });

  it('setCartQuantity로 기존 항목 수량 변경(중복 추가 아님)', () => {
    setCartQuantity('a1', 1);
    expect(setCartQuantity('a1', 3)).toEqual([{ artworkId: 'a1', quantity: 3 }]);
  });

  it('setCartQuantity 수량 0 이하는 항목 제거', () => {
    setCartQuantity('a1', 2);
    expect(setCartQuantity('a1', 0)).toEqual([]);
  });

  it('removeFromCart', () => {
    setCartQuantity('a1', 1);
    setCartQuantity('a2', 1);
    expect(removeFromCart('a1')).toEqual([{ artworkId: 'a2', quantity: 1 }]);
  });

  it('cartCount는 수량 합', () => {
    setCartQuantity('a1', 2);
    setCartQuantity('a2', 3);
    expect(cartCount(getCart())).toBe(5);
  });

  it('clearCart', () => {
    setCartQuantity('a1', 1);
    expect(clearCart()).toEqual([]);
    expect(getCart()).toEqual([]);
  });
});
```

- [ ] **Step 3: 실패 확인** — Run: `npm test -- cart-storage` → FAIL (모듈 없음)

- [ ] **Step 4: 구현** — `lib/cart/cart-storage.ts`

```typescript
import { storageGet, storageSet } from '@/lib/storage';
import type { CartItem } from '@/types';

const CART_KEY = 'saf:cart';

export function getCart(): CartItem[] {
  const parsed = storageGet<unknown>(CART_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (x): x is CartItem =>
      !!x &&
      typeof (x as CartItem).artworkId === 'string' &&
      typeof (x as CartItem).quantity === 'number'
  );
}

/** 항목 수량을 절대값으로 설정. 0 이하면 제거. 신규면 추가. */
export function setCartQuantity(artworkId: string, quantity: number): CartItem[] {
  const qty = Math.floor(quantity);
  const current = getCart();
  let next: CartItem[];
  if (qty <= 0) {
    next = current.filter((i) => i.artworkId !== artworkId);
  } else if (current.some((i) => i.artworkId === artworkId)) {
    next = current.map((i) => (i.artworkId === artworkId ? { ...i, quantity: qty } : i));
  } else {
    next = [{ artworkId, quantity: qty }, ...current];
  }
  storageSet(CART_KEY, next);
  return next;
}

export function removeFromCart(artworkId: string): CartItem[] {
  const next = getCart().filter((i) => i.artworkId !== artworkId);
  storageSet(CART_KEY, next);
  return next;
}

export function clearCart(): CartItem[] {
  storageSet(CART_KEY, []);
  return [];
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
```

- [ ] **Step 5: 통과 확인** — Run: `npm test -- cart-storage` → PASS (7)

- [ ] **Step 6: type-check + 커밋**

```bash
git add lib/cart/cart-storage.ts __tests__/lib/cart/cart-storage.test.ts types/index.ts
git commit -m "feat(cart): localStorage cart storage util + CartItem type

요약: 장바구니 localStorage util(수량 포함)과 CartItem 타입 추가"
```

---

## Task 3: 카트 DB 서버액션 (uuid 검증)

`app/actions/mypage.ts`의 wishlist 액션을 미러하되 **uuid 검증** + quantity upsert. 별도 파일 `app/actions/cart.ts`.

**Files:**

- Create: `app/actions/cart.ts`
- Create: `__tests__/actions/cart.test.ts`

- [ ] **Step 1: 실패 테스트** — `__tests__/actions/cart.test.ts` (mypage 테스트 모킹 스타일 참고; Supabase·auth 모킹)

```typescript
import { upsertCartItem } from '@/app/actions/cart';

jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const UUID = 'e637bb45-e888-443b-8f2e-8911c79d9ba7';

// 헬퍼: getUser + upsert 체이너 모킹 (mypage.test 패턴 참고)
// (구현자: 기존 __tests__에서 createSupabaseServerClient 모킹 예시를 따른다)

describe('upsertCartItem', () => {
  it('비-uuid id는 invalid_id', async () => {
    expect(await upsertCartItem('35', 1)).toEqual({ error: 'invalid_id' });
  });
  it('수량 0 이하는 invalid_quantity', async () => {
    expect(await upsertCartItem(UUID, 0)).toEqual({ error: 'invalid_quantity' });
  });
  // 로그인 안 됨 → unauthenticated (auth mock이 user:null 반환하도록 설정)
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- actions/cart` → FAIL

- [ ] **Step 3: 구현** — `app/actions/cart.ts`

```typescript
'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import type { CartItem } from '@/types';

const MAX_CART_BATCH = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id);

export async function getCartItems(): Promise<{ items: CartItem[]; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], error: 'unauthenticated' };

  const { data, error } = await supabase
    .from('cart_items')
    .select('artwork_id, quantity')
    .eq('user_id', user.id);
  if (error) return { items: [], error: error.message };
  return { items: (data ?? []).map((r) => ({ artworkId: r.artwork_id, quantity: r.quantity })) };
}

export async function upsertCartItem(
  artworkId: string,
  quantity: number
): Promise<{ error?: string }> {
  if (!isUuid(artworkId)) return { error: 'invalid_id' };
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: 'invalid_quantity' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase
    .from('cart_items')
    .upsert(
      { user_id: user.id, artwork_id: artworkId, quantity, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,artwork_id' }
    );
  if (error) return { error: error.message };
  return {};
}

export async function removeCartItem(artworkId: string): Promise<{ error?: string }> {
  if (!isUuid(artworkId)) return { error: 'invalid_id' };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user.id)
    .eq('artwork_id', artworkId);
  if (error) return { error: error.message };
  return {};
}

export async function clearCartItems(): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id);
  if (error) return { error: error.message };
  return {};
}

/** 게스트 local 카트를 로그인 DB로 병합. 같은 artwork면 더 큰 수량 채택(덮어쓰기). */
export async function mergeGuestCart(items: CartItem[]): Promise<{ error?: string }> {
  const valid = items.filter(
    (i) => isUuid(i.artworkId) && Number.isInteger(i.quantity) && i.quantity > 0
  );
  if (valid.length === 0) return {};
  if (valid.length > MAX_CART_BATCH) return { error: 'too_many' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rows = valid.map((i) => ({
    user_id: user.id,
    artwork_id: i.artworkId,
    quantity: i.quantity,
  }));
  const { error } = await supabase
    .from('cart_items')
    .upsert(rows, { onConflict: 'user_id,artwork_id' });
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Step 4: 통과 확인** — Run: `npm test -- actions/cart` → PASS

- [ ] **Step 5: type-check + 커밋**

> 주: 이 task는 `cart_items` 타입이 `types/supabase.ts`에 있어야 type-check 통과 → Task 1 마이그레이션 적용 + 타입 재생성이 선행돼야 한다. 컨트롤러가 Task 1 적용 후 이 task 진행.

```bash
git add app/actions/cart.ts __tests__/actions/cart.test.ts
git commit -m "feat(cart): cart DB server actions with uuid validation

요약: 장바구니 DB 서버액션(get/upsert/remove/clear/merge) — uuid 검증, wishlist 숫자검증 버그 회피"
```

---

## Task 4: CartProvider (WishlistProvider 미러)

`components/providers/WishlistProvider.tsx` 구조를 그대로 미러: localStorage-first, `onAuthStateChange`로 로그인 시 게스트 카트 병합 + DB 로드, 로그아웃 시 clear, 신원 변경 시 clear. quantity·드로어 open 상태 추가.

**Files:**

- Create: `components/providers/CartProvider.tsx`
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: CartProvider 구현** (WishlistProvider 미러 + 아래 인터페이스)

```typescript
'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getCart, setCartQuantity, removeFromCart, clearCart, cartCount } from '@/lib/cart/cart-storage';
import type { CartItem } from '@/types';

interface CartContextValue {
  items: CartItem[];
  count: number;
  mounted: boolean;
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  setQuantity: (artworkId: string, quantity: number) => void;
  addOne: (artworkId: string, opts?: { unique?: boolean }) => void;
  remove: (artworkId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue>({
  items: [], count: 0, mounted: false, isOpen: false,
  openDrawer: () => {}, closeDrawer: () => {}, setQuantity: () => {},
  addOne: () => {}, remove: () => {}, clear: () => {},
});

export function useCart(): CartContextValue {
  return useContext(CartContext);
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    setItems(getCart());
    setMounted(true);

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    import('@/lib/auth/client')
      .then(({ createSupabaseBrowserClient }) => {
        if (cancelled) return;
        const supabase = createSupabaseBrowserClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return;
          const newUserId = session?.user?.id ?? null;
          const prevUserId = userIdRef.current;
          userIdRef.current = newUserId;

          if (event === 'SIGNED_OUT') {
            clearCart();
            setItems([]);
            return;
          }

          // 첫 로그인(prevUserId === null): 게스트 카트를 DB로 병합 후 DB 로드
          if (event === 'SIGNED_IN' && prevUserId === null) {
            const guest = getCart();
            void Promise.all([
              import('@/app/actions/cart'),
            ]).then(async ([{ mergeGuestCart, getCartItems }]) => {
              if (guest.length > 0) await mergeGuestCart(guest).catch(() => {});
              const { items: dbItems } = await getCartItems();
              clearCart();
              // DB가 source of truth로 — local에도 미러(드로어 즉시 표시용)
              dbItems.forEach((i) => setCartQuantity(i.artworkId, i.quantity));
              if (!cancelled) setItems(getCart());
            });
            return;
          }

          // 다른 계정으로 신원 변경: 이전 사용자 로컬 카트가 새 사용자로 새지 않게 비움
          if (event === 'SIGNED_IN' && prevUserId !== null && prevUserId !== newUserId) {
            clearCart();
            setItems([]);
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // DB optimistic 동기화 (로그인 상태일 때만)
  const syncUpsert = useCallback((artworkId: string, quantity: number) => {
    if (!userIdRef.current) return;
    import('@/app/actions/cart')
      .then(({ upsertCartItem }) => upsertCartItem(artworkId, quantity).catch(() => {}))
      .catch(() => {});
  }, []);
  const syncRemove = useCallback((artworkId: string) => {
    if (!userIdRef.current) return;
    import('@/app/actions/cart')
      .then(({ removeCartItem }) => removeCartItem(artworkId).catch(() => {}))
      .catch(() => {});
  }, []);

  const setQuantity = useCallback((artworkId: string, quantity: number) => {
    const next = setCartQuantity(artworkId, quantity);
    setItems(next);
    if (quantity <= 0) syncRemove(artworkId);
    else syncUpsert(artworkId, Math.floor(quantity));
  }, [syncUpsert, syncRemove]);

  const addOne = useCallback((artworkId: string, opts?: { unique?: boolean }) => {
    const current = getCart().find((i) => i.artworkId === artworkId);
    const nextQty = opts?.unique ? 1 : (current?.quantity ?? 0) + 1;
    const next = setCartQuantity(artworkId, nextQty);
    setItems(next);
    syncUpsert(artworkId, nextQty);
  }, [syncUpsert]);

  const remove = useCallback((artworkId: string) => {
    setItems(removeFromCart(artworkId));
    syncRemove(artworkId);
  }, [syncRemove]);

  const clear = useCallback(() => {
    setItems(clearCart());
    if (userIdRef.current) {
      import('@/app/actions/cart').then(({ clearCartItems }) => clearCartItems().catch(() => {})).catch(() => {});
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        items, count: cartCount(items), mounted, isOpen,
        openDrawer: () => setIsOpen(true), closeDrawer: () => setIsOpen(false),
        setQuantity, addOne, remove, clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
```

- [ ] **Step 2: layout 래핑** — `app/[locale]/layout.tsx`의 `WishlistProvider` 안쪽(또는 인접)에 `CartProvider` 추가. import 추가 후:

```tsx
<WishlistProvider>
  <CartProvider>{/* 기존 children/Header/Footer 트리 */}</CartProvider>
</WishlistProvider>
```

- [ ] **Step 3: type-check + 빌드 sanity + 커밋**

Run: `npm run type-check`
Expected: 에러 없음

```bash
git add components/providers/CartProvider.tsx app/[locale]/layout.tsx
git commit -m "feat(cart): CartProvider with localStorage + DB merge (mirror WishlistProvider)

요약: 장바구니 상태 Provider — localStorage-first, 로그인 시 게스트 병합+DB 동기화, 드로어 open 상태"
```

---

## Task 5: 카트 표시용 작품 상세 일괄 조회 액션

드로어·`/cart`·`/checkout`이 카트 항목(uuid)에 대한 title/price/image/edition/available을 보여줘야 한다. 카트는 클라이언트 상태이므로 서버액션으로 일괄 조회.

**Files:**

- Create: `app/actions/cart-artworks.ts`

- [ ] **Step 1: 구현**

```typescript
'use server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { parsePrice } from '@/lib/parsePrice';

export interface CartArtworkInfo {
  id: string;
  title: string;
  artistName: string;
  price: number;
  image: string | null;
  editionType: 'unique' | 'limited' | 'open' | null;
  isAvailable: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCartArtworks(ids: string[]): Promise<CartArtworkInfo[]> {
  const valid = [...new Set(ids.filter((id) => UUID_RE.test(id)))].slice(0, 100);
  if (valid.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, price, images, edition_type, artists(name_ko)')
    .in('id', valid)
    .eq('is_hidden', false);
  if (!artworks) return [];

  const results: CartArtworkInfo[] = [];
  for (const a of artworks) {
    const { data: availResult } = await supabase.rpc('check_artwork_availability', {
      p_artwork_id: a.id,
    });
    const isAvailable = Array.isArray(availResult) && availResult[0]?.is_available === true;
    const artistRow = a.artists as { name_ko: string } | { name_ko: string }[] | null;
    const artistName = Array.isArray(artistRow)
      ? (artistRow[0]?.name_ko ?? '')
      : (artistRow?.name_ko ?? '');
    const images = Array.isArray(a.images) ? (a.images as string[]) : [];
    results.push({
      id: a.id,
      title: a.title ?? '',
      artistName,
      price: parsePrice(a.price),
      image: images[0] ?? null,
      editionType: (a.edition_type as CartArtworkInfo['editionType']) ?? null,
      isAvailable,
    });
  }
  return results;
}
```

- [ ] **Step 2: type-check + 커밋**

```bash
git add app/actions/cart-artworks.ts
git commit -m "feat(cart): batch fetch cart artwork details (title/price/image/availability)

요약: 카트 항목 표시용 작품 상세 일괄 조회 서버액션"
```

---

## Task 6: AddToCartButton + ArtworkPurchaseCTA 통합

**Files:**

- Create: `components/features/AddToCartButton.tsx`
- Modify: `components/features/ArtworkPurchaseCTA.tsx`

- [ ] **Step 1: AddToCartButton 구현** (`Button` 컴포넌트 재사용, i18n `cart` 네임스페이스)

```tsx
'use client';

import { ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { useCart } from '@/components/providers/CartProvider';

export default function AddToCartButton({
  artworkId,
  isUnique,
  disabled,
}: {
  artworkId: string;
  isUnique: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations('cart');
  const { addOne, openDrawer, items, mounted } = useCart();
  const inCart = mounted && items.some((i) => i.artworkId === artworkId);

  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={disabled}
      onClick={() => {
        addOne(artworkId, { unique: isUnique });
        openDrawer();
      }}
    >
      <ShoppingBag className="w-4 h-4 mr-2" aria-hidden="true" />
      {inCart ? t('inCart') : t('addToCart')}
    </Button>
  );
}
```

- [ ] **Step 2: ArtworkPurchaseCTA에 추가** — 기존 "바로 구매" LinkButton([ArtworkPurchaseCTA.tsx](../../../components/features/ArtworkPurchaseCTA.tsx) 약 268행 `/checkout/${artworkId}`) 바로 아래/위에 `AddToCartButton` 배치. CTA가 받는 `edition_type`/`sold` 정보로 `isUnique`/`disabled` 전달. (현 CTA props에 edition 정보가 없으면 부모 [artworks/[id]/page.tsx](../../../app/[locale]/artworks/[id]/page.tsx) 약 429·485행에서 `artwork.edition_type`·`artwork.sold` 전달 추가.)

- [ ] **Step 3: type-check + 커밋**

```bash
git add components/features/AddToCartButton.tsx components/features/ArtworkPurchaseCTA.tsx app/[locale]/artworks/[id]/page.tsx
git commit -m "feat(cart): add 'add to cart' button alongside buy-now on artwork CTA

요약: 작품 상세 구매 CTA에 장바구니 담기 버튼 추가(바로구매와 병행, unique 처리)"
```

---

## Task 7: CartNavButton (헤더 아이콘 + 배지)

`WishlistNavButton`을 미러하되 클릭 시 link 대신 드로어 open.

**Files:**

- Create: `components/common/Header/CartNavButton.tsx`
- Modify: `components/common/Header/DesktopNav.tsx`, `components/common/Header/FullscreenMenu.tsx`

- [ ] **Step 1: 구현** (`WishlistNavButton` 미러; `Link` → `button onClick=openDrawer`, `Heart` → `ShoppingBag`)

```tsx
'use client';

import { ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCart } from '@/components/providers/CartProvider';
import { cn } from '@/lib/utils/cn';

export default function CartNavButton({
  textColor,
  className,
}: {
  textColor: string;
  className?: string;
}) {
  const { count, mounted, openDrawer } = useCart();
  const t = useTranslations('cart');

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={t('headerLabel')}
      className={cn(
        'relative flex items-center justify-center',
        'p-3 min-w-[44px] min-h-[44px] lg:p-2 lg:min-w-[44px] lg:min-h-[44px]',
        'transition-[transform,color] duration-150 active:scale-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg',
        textColor,
        'hover:text-primary',
        className
      )}
    >
      <ShoppingBag className="w-5 h-5 lg:w-4 lg:h-4" aria-hidden="true" />
      {mounted && (
        <span
          className={cn(
            'absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary-strong text-white text-[10px] font-bold leading-none',
            'transition-[opacity,transform] duration-200 motion-reduce:transition-none',
            count > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
          )}
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: 헤더 배치** — `DesktopNav.tsx`의 `<WishlistNavButton ... />`(약 109행) 옆에 `<CartNavButton textColor={textColor} />` 추가. `FullscreenMenu.tsx`(모바일)에도 카트 진입점 추가(드로어 open 버튼 또는 `/cart` 링크).

- [ ] **Step 3: type-check + 커밋**

```bash
git add components/common/Header/CartNavButton.tsx components/common/Header/DesktopNav.tsx components/common/Header/FullscreenMenu.tsx
git commit -m "feat(cart): header cart icon with count badge opens drawer

요약: 헤더 카트 아이콘+수량 배지(클릭 시 드로어), 데스크탑·모바일 네비 배치"
```

---

## Task 8: CartDrawer (슬라이드 패널)

**Files:**

- Create: `components/features/CartDrawer.tsx`
- Modify: `app/[locale]/layout.tsx` (CartProvider 하위에 `<CartDrawer />` 1회 마운트)

- [ ] **Step 1: 구현 요점** (직접 인라인 제작 금지 — 기존 모달/오버레이 패턴 재사용 권장)
  - `useCart()`로 `isOpen`/`items`/`closeDrawer`/`setQuantity`/`remove` 소비.
  - 열릴 때 `getCartArtworks(items.map(i=>i.artworkId))`로 상세 로드(useEffect, isOpen·items 변화 시).
  - 우측 고정 패널: `fixed inset-y-0 right-0 w-full max-w-md`, 백드롭 `fixed inset-0 bg-black/40`. 화이트큐브 무채색(`bg-canvas-soft`/`gallery` 토큰).
  - 각 항목: `SafeImage` 썸네일, 제목/작가(`.text-artwork-title`/`.text-caption-meta`), 가격, 수량 스테퍼(unique면 비활성+1 고정), 삭제 버튼. 품절 항목은 경고 배지(`danger` 토큰) + 결제 차단 안내.
  - 하단: 소계(`sun.DEFAULT` 가격 강조 텍스트만, 배경 아님), "장바구니 전체보기" → `Link /cart`, "결제하기" → `Link /checkout`(품절 항목 있으면 비활성).
  - 접근성: `role="dialog"` `aria-modal="true"` `aria-label`, ESC 닫기, 포커스 트랩, 백드롭 클릭 닫기. `prefers-reduced-motion` 시 슬라이드 애니메이션 0.01ms.
  - i18n `cart` 네임스페이스 전부 사용(한국어 리터럴 금지).

- [ ] **Step 2: layout에 마운트** — `app/[locale]/layout.tsx` CartProvider 내부에 `<CartDrawer />` 추가(전역 1회).

- [ ] **Step 3: type-check + 커밋**

```bash
git add components/features/CartDrawer.tsx app/[locale]/layout.tsx
git commit -m "feat(cart): slide-over cart drawer with items, quantity, subtotal, CTAs

요약: 우측 슬라이드 장바구니 드로어 — 목록·수량·삭제·소계·결제/전체보기, a11y(dialog·focus trap·ESC)"
```

---

## Task 9: `/cart` 전체 페이지

`WishlistPageContent` + `app/[locale]/wishlist/page.tsx`를 미러.

**Files:**

- Create: `components/features/CartPageContent.tsx`
- Create: `app/[locale]/cart/page.tsx`
- Create: `e2e/a11y/cart.spec.ts`

- [ ] **Step 1: CartPageContent 구현** — 드로어와 동일 데이터(`useCart` + `getCartArtworks`)를 전체 페이지 레이아웃으로. 수량 스테퍼·삭제·"장바구니 비우기"·소계·"결제하기"(`Link /checkout`). 빈 카트 상태(empty state) + "작품 둘러보기" → `/artworks`. 표준 컴포넌트(Card/Button/Section) 재사용.

- [ ] **Step 2: 페이지 셸** — `app/[locale]/cart/page.tsx` (`/wishlist/page.tsx` 미러: `setRequestLocale`, `getTranslations({locale})` 명시, PageHero + Section + CartPageContent). **force-static에서 locale 명시 전달**(메모리). 공개 라우트이므로 i18n 필수.

- [ ] **Step 3: a11y spec** — `e2e/a11y/cart.spec.ts` (`e2e/a11y/`의 기존 spec 미러; `/cart`·`/en/cart` 빈 카트 상태 axe 스캔). CLAUDE.md: 신규 공개 페이지 a11y 필수(미작성 시 머지 차단).

- [ ] **Step 4: 빌드 sanity + 커밋**

```bash
git add components/features/CartPageContent.tsx app/[locale]/cart/page.tsx e2e/a11y/cart.spec.ts
git commit -m "feat(cart): /cart full page with a11y spec

요약: 장바구니 전체 페이지(/cart) + 빈 상태 + a11y e2e spec"
```

---

## Task 10: 다품목 `/checkout` 페이지 + 결제

가장 복잡한 task. 기존 단건 `[artworkId]/CheckoutClient.tsx`·`BuyerInfoForm.tsx`·Toss 흐름을 재사용해 다품목 결제를 구성한다. **먼저 `app/[locale]/checkout/[artworkId]/CheckoutClient.tsx`와 `BuyerInfoForm.tsx`를 읽어** 재사용 가능한 부분(BuyerInfoForm, Toss SDK 호출, 성공/실패 리다이렉트)을 파악하라.

**Files:**

- Create: `app/[locale]/checkout/page.tsx` (셸)
- Create: `app/[locale]/checkout/CartCheckoutClient.tsx`

- [ ] **Step 1: 셸 페이지** — `app/[locale]/checkout/page.tsx` (server component): locale 처리(`setRequestLocale`), `CartCheckoutClient` 렌더. 카트가 클라이언트 상태이므로 작품 데이터는 클라이언트에서 `getCartArtworks`로 로드.

- [ ] **Step 2: CartCheckoutClient** — 핵심 동작:
  - `useCart()`로 items 읽기. 비었으면 `/cart`로 안내(빈 카트 결제 차단).
  - `getCartArtworks(items)`로 상세·가격·availability 로드. 품절 항목 있으면 **부분 차단 UI**(품절 항목 하이라이트 + "제거 후 진행", 정책 4) — `removeFromCart`로 빼고 재계산.
  - 소계 = Σ(price × quantity), 배송료 = 클라이언트 추정 표시(서버가 최종 계산). 합산 1회.
  - `BuyerInfoForm` 재사용(배송정보 입력).
  - 결제하기 → `createOrder({ items: items.map(i => ({artworkId: i.artworkId, quantity: i.quantity})), ...buyerInfo, locale })` 호출(Plan 1 백엔드). 반환 `unavailable[]` 있으면 해당 항목 하이라이트 + 재시도. 성공 시 `orderId/orderNo/checkoutToken`으로 기존 Toss 결제창 흐름([CheckoutClient.tsx](../../../app/[locale]/checkout/[artworkId]/CheckoutClient.tsx) 약 299–342행 `loadTossPayments`/`requestPayment`)을 동일하게 호출.
  - 성공/실패 리다이렉트: 기존 `/checkout/{artworkId}/success|fail` 대신 카트용 `/checkout/success|fail`이 필요. **단, 결제 랜딩은 `window.location.search`로 파라미터를 읽어야 함**(메모리: server searchParams 금지 회귀). 기존 `success/SuccessClient.tsx`·`fail/FailClient.tsx` 로직을 공유하는 셸을 `/checkout/success`·`/checkout/fail`로 추가(주문 기반이라 artworkId 불필요).
  - ⚠️ Toss `orderName`은 createOrder가 이미 "대표작품 외 N건"으로 반환 → 그대로 사용.

- [ ] **Step 3: success/fail 셸 추가** — `app/[locale]/checkout/success/page.tsx`+`SuccessClient`, `.../fail/page.tsx`+`FailClient`. 기존 `[artworkId]/success`·`fail`의 클라이언트 로직(window.location.search confirm 호출)을 **공유 컴포넌트로 추출**하거나 복제. confirm API(`/api/payments/toss/confirm`)는 orderId 기반이라 그대로 동작.

- [ ] **Step 4: type-check + 빌드 + 커밋**

Run: `npm run type-check && npm run build`
Expected: 성공(SSG 호환)

```bash
git add app/[locale]/checkout/page.tsx app/[locale]/checkout/CartCheckoutClient.tsx app/[locale]/checkout/success app/[locale]/checkout/fail
git commit -m "feat(cart): multi-item /checkout page reusing Toss flow

요약: 다품목 /checkout 페이지 — 카트 기반 결제, 품절 부분차단, createOrder(items) + Toss 재사용, 주문기반 success/fail"
```

---

## Task 11: i18n 메시지 (`cart` 네임스페이스)

**Files:**

- Modify: `messages/ko.json`, `messages/en.json`

- [ ] **Step 1: 키 추가** — 두 파일에 `cart` 네임스페이스. 최소 키(드로어·페이지·버튼·상태):

```jsonc
// ko.json "cart": {
//   "headerLabel": "장바구니",
//   "addToCart": "장바구니 담기",
//   "inCart": "장바구니에 있음",
//   "title": "장바구니",
//   "empty": "장바구니가 비어 있습니다",
//   "browseArtworks": "작품 둘러보기",
//   "quantity": "수량",
//   "remove": "삭제",
//   "clear": "장바구니 비우기",
//   "subtotal": "소계",
//   "shipping": "배송료",
//   "total": "합계",
//   "viewCart": "장바구니 전체보기",
//   "checkout": "결제하기",
//   "soldOut": "품절",
//   "soldOutNotice": "품절된 작품을 제거한 뒤 결제할 수 있습니다",
//   "uniqueQtyLocked": "이 작품은 1점만 구매할 수 있습니다"
// }
```

en.json도 동일 키 영문. **모든 신규 카트 UI 문자열은 이 네임스페이스를 사용**(한국어 리터럴 직접 금지).

- [ ] **Step 2: placeholder 검증 + 커밋**

Run: `npm run build` (빌드 마지막 `verify:i18n-placeholders` 통과 확인)

```bash
git add messages/ko.json messages/en.json
git commit -m "feat(cart): i18n messages for cart namespace (ko/en)

요약: 장바구니 UI i18n 메시지(ko/en) 추가"
```

---

## Task 12: 전체 회귀 + 빌드 검증

- [ ] **Step 1: 전체 테스트** — Run: `npm test` → 전 스위트 PASS
- [ ] **Step 2: 타입·린트** — Run: `npm run type-check && npm run lint` → 에러 없음
- [ ] **Step 3: a11y** — Run: `npx playwright test e2e/a11y/cart.spec.ts` → PASS (로컬 dev 서버 필요 시 가이드대로)
- [ ] **Step 4: 프로덕션 빌드** — Run: `npm run build` → 성공(SSG)
- [ ] **Step 5: 수동 스모크** — 게스트로 작품 2점 담기 → 드로어 수량 조정 → `/cart` → `/checkout` → (테스트 결제) 주문 생성·order_items 2행 확인. 로그인 후 게스트 카트 병합 확인.
- [ ] **Step 6: PR/머지** (메모리: 커밋 후 push, PR이면 머지까지) — 단 결제 연결이라 머지 전 사용자 확인 권장.

---

## Self-Review 메모 (계획 작성자 검증)

- **스펙 커버리지:** §1 상태관리(CartProvider, Task4)·§2 `cart_items`(Task1)·§4 드로어(Task8)·`/cart`(Task9)·`/checkout`(Task10)·담기버튼(Task6)·헤더아이콘(Task7)·§5 i18n(Task11)·a11y(Task9)·unique 강제(Task2·6·8)·게스트 병합(Task3·4)·부분차단(Task10) 모두 task 존재.
- **id 규약:** 전 task가 artwork **uuid** 사용(cart_items.artwork_id uuid, 서버액션 uuid 검증). wishlist 숫자검증 버그 미답습 — 명시.
- **타입 일관성:** `CartItem {artworkId, quantity}`(types/index), `CartArtworkInfo`(cart-artworks), `useCart()` 인터페이스가 task 전반 일치.
- **선행 의존:** Task 3·5·10은 `cart_items` 타입(Task1 마이그레이션 적용+타입재생성)이 선행돼야 type-check 통과 → 컨트롤러가 Task1 적용 직후 진행.
- **위험:** Task 10(다품목 결제)이 최고 위험 — 기존 Toss 흐름 재사용 + 결제 랜딩 `window.location.search` 패턴 보존 필수. success/fail은 주문기반이라 artworkId 불필요.
- **미해결:** 배송료 클라이언트 추정 표시 vs 서버 최종값 — createOrder가 `totalAmount` 권위값 반환하므로 결제 직전 그 값 사용(표시용 추정은 참고).

```

```
