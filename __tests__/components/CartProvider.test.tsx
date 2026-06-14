/**
 * CartProvider 통합 테스트
 *
 * 게스트/로그인 카트 상태 병합 로직을 회귀 방지 관점에서 검증합니다.
 * 핵심: onAuthStateChange 콜백을 수동 트리거해 다음 시나리오를 재현합니다.
 *  - 게스트 add (DB sync 미호출)
 *  - 첫 로그인 (INITIAL_SESSION 이벤트로도 동작 — 3차 CRITICAL 회귀)
 *  - in-page 로그인 (SIGNED_IN)
 *  - 병합/로드 에러 시 게스트 카트 보존 (2차 게스트손실 가드)
 *  - 로그아웃 (clear)
 *  - 신원 변경 (clear + 새 유저 DB 로드)
 *  - unique addOne (수량 1 고정)
 *
 * CartProvider는 `@/lib/auth/client`와 `@/app/actions/cart`를 동적 import 하므로
 * 두 모듈을 jest.mock 으로 대체하고, onAuthStateChange 등록 콜백을 캡처해
 * 테스트에서 직접 호출한다.
 *
 * @jest-environment jsdom
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import CartProvider, { useCart } from '@/components/providers/CartProvider';
import type { CartItem } from '@/types';

// --- onAuthStateChange 콜백 캡처 ---
type AuthCallback = (event: string, session: { user: { id: string } } | null) => void;
let authCallback: AuthCallback | null = null;
const unsubscribeSpy = jest.fn();

const onAuthStateChange = jest.fn((cb: AuthCallback) => {
  authCallback = cb;
  return { data: { subscription: { unsubscribe: unsubscribeSpy } } };
});

jest.mock('@/lib/auth/client', () => ({
  createSupabaseBrowserClient: jest.fn(() => ({
    auth: { onAuthStateChange },
  })),
}));

// --- cart Server Action 모킹 ---
const mergeGuestCart = jest.fn(async (_items: CartItem[]) => ({}) as { error?: string });
const getCartItems = jest.fn(async () => ({ items: [] }) as { items: CartItem[]; error?: string });
const upsertCartItem = jest.fn(async (_id: string, _qty: number) => ({}) as { error?: string });
const removeCartItem = jest.fn(async (_id: string) => ({}) as { error?: string });
const clearCartItems = jest.fn(async () => ({}) as { error?: string });

jest.mock('@/app/actions/cart', () => ({
  mergeGuestCart: (...args: [CartItem[]]) => mergeGuestCart(...args),
  getCartItems: () => getCartItems(),
  upsertCartItem: (...args: [string, number]) => upsertCartItem(...args),
  removeCartItem: (...args: [string]) => removeCartItem(...args),
  clearCartItems: () => clearCartItems(),
}));

// --- 테스트용 컨슈머 ---
const ADD_BTN = 'add-btn';
const ADD_UNIQUE_BTN = 'add-unique-btn';

function CartHarness({ artworkId }: { artworkId: string }) {
  const { items, count, addOne } = useCart();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <ul data-testid="items">
        {items.map((i) => (
          <li key={i.artworkId} data-testid={`item-${i.artworkId}`}>
            {i.artworkId}:{i.quantity}
          </li>
        ))}
      </ul>
      <button data-testid={ADD_BTN} onClick={() => addOne(artworkId)}>
        add
      </button>
      <button data-testid={ADD_UNIQUE_BTN} onClick={() => addOne(artworkId, { unique: true })}>
        add-unique
      </button>
    </div>
  );
}

const A1 = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const DB_ITEM = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const DB_ITEM_2 = 'cccccccc-3333-4333-8333-cccccccccccc';

function renderCart(artworkId = A1) {
  return render(
    <CartProvider>
      <CartHarness artworkId={artworkId} />
    </CartProvider>
  );
}

/** onAuthStateChange 구독 등록(동적 import resolve)을 기다린다. */
async function waitForAuthSubscription() {
  await waitFor(() => expect(authCallback).not.toBeNull());
}

/**
 * auth 이벤트를 트리거하고, 콜백 내부의 동적 import 체인(mergeGuestCart/getCartItems)이
 * 모두 flush 될 때까지 microtask 큐를 비운다. act()로 감싸 상태 업데이트 경고를 방지.
 */
async function emitAuth(event: string, userId: string | null) {
  await act(async () => {
    authCallback?.(event, userId ? { user: { id: userId } } : null);
    // 콜백 내부 .then 체인(동적 import 2단계 + await) flush
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  window.localStorage.clear();
  authCallback = null;
  unsubscribeSpy.mockClear();
  onAuthStateChange.mockClear();
  mergeGuestCart.mockClear();
  getCartItems.mockClear();
  upsertCartItem.mockClear();
  removeCartItem.mockClear();
  clearCartItems.mockClear();
  mergeGuestCart.mockResolvedValue({});
  getCartItems.mockResolvedValue({ items: [] });
  upsertCartItem.mockResolvedValue({});
  removeCartItem.mockResolvedValue({});
  clearCartItems.mockResolvedValue({});
});

describe('CartProvider — 게스트 동작', () => {
  it('게스트 addOne → items 반영 + localStorage 기록, DB sync 미호출', async () => {
    renderCart();
    await waitForAuthSubscription();

    await act(async () => {
      screen.getByTestId(ADD_BTN).click();
    });

    expect(screen.getByTestId(`item-${A1}`)).toHaveTextContent(`${A1}:1`);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    // localStorage에 기록되었는지
    const stored = JSON.parse(window.localStorage.getItem('saf:cart') ?? '[]');
    expect(stored).toEqual([{ artworkId: A1, quantity: 1 }]);
    // 미로그인 상태 → DB upsert 미호출
    expect(upsertCartItem).not.toHaveBeenCalled();
  });

  it('게스트 addOne 두 번 → 수량 누적(2)', async () => {
    renderCart();
    await waitForAuthSubscription();

    await act(async () => {
      screen.getByTestId(ADD_BTN).click();
    });
    await act(async () => {
      screen.getByTestId(ADD_BTN).click();
    });

    expect(screen.getByTestId(`item-${A1}`)).toHaveTextContent(`${A1}:2`);
    expect(upsertCartItem).not.toHaveBeenCalled();
  });

  it('unique addOne → 두 번 눌러도 quantity 1 고정', async () => {
    renderCart();
    await waitForAuthSubscription();

    await act(async () => {
      screen.getByTestId(ADD_UNIQUE_BTN).click();
    });
    await act(async () => {
      screen.getByTestId(ADD_UNIQUE_BTN).click();
    });

    expect(screen.getByTestId(`item-${A1}`)).toHaveTextContent(`${A1}:1`);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

describe('CartProvider — 첫 로그인 병합', () => {
  it('INITIAL_SESSION 이벤트로 첫 로그인 — 게스트 카트 mergeGuestCart 호출 + DB 로드로 교체 (3차 CRITICAL)', async () => {
    // 게스트 카트 시드
    window.localStorage.setItem('saf:cart', JSON.stringify([{ artworkId: A1, quantity: 2 }]));
    getCartItems.mockResolvedValue({ items: [{ artworkId: DB_ITEM, quantity: 5 }] });

    renderCart();
    await waitForAuthSubscription();

    // event === 'SIGNED_IN'이 아니라 INITIAL_SESSION 이어도 병합·로드가 동작해야 한다.
    await emitAuth('INITIAL_SESSION', 'user-1');

    // 게스트 카트가 mergeGuestCart로 전달됨
    expect(mergeGuestCart).toHaveBeenCalledTimes(1);
    expect(mergeGuestCart).toHaveBeenCalledWith([{ artworkId: A1, quantity: 2 }]);
    // DB 로드 수행
    expect(getCartItems).toHaveBeenCalledTimes(1);

    // items가 DB값(DB_ITEM:5)으로 교체됨
    await waitFor(() => {
      expect(screen.getByTestId(`item-${DB_ITEM}`)).toHaveTextContent(`${DB_ITEM}:5`);
    });
    expect(screen.queryByTestId(`item-${A1}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('5');
  });

  it('SIGNED_IN(in-page 로그인)도 동일하게 병합·DB 로드', async () => {
    window.localStorage.setItem('saf:cart', JSON.stringify([{ artworkId: A1, quantity: 1 }]));
    getCartItems.mockResolvedValue({ items: [{ artworkId: DB_ITEM, quantity: 3 }] });

    renderCart();
    await waitForAuthSubscription();

    await emitAuth('SIGNED_IN', 'user-1');

    expect(mergeGuestCart).toHaveBeenCalledWith([{ artworkId: A1, quantity: 1 }]);
    expect(getCartItems).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByTestId(`item-${DB_ITEM}`)).toHaveTextContent(`${DB_ITEM}:3`);
    });
  });

  it('게스트 카트가 비어 있으면 mergeGuestCart 미호출, DB 로드만 수행', async () => {
    getCartItems.mockResolvedValue({ items: [{ artworkId: DB_ITEM, quantity: 1 }] });

    renderCart();
    await waitForAuthSubscription();

    await emitAuth('INITIAL_SESSION', 'user-1');

    expect(mergeGuestCart).not.toHaveBeenCalled();
    expect(getCartItems).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByTestId(`item-${DB_ITEM}`)).toBeInTheDocument();
    });
  });
});

describe('CartProvider — 게스트손실 가드 (2차)', () => {
  it('getCartItems가 error 반환 → clearCart 안 하고 게스트 카트 보존', async () => {
    window.localStorage.setItem('saf:cart', JSON.stringify([{ artworkId: A1, quantity: 2 }]));
    // 로드 에러
    getCartItems.mockResolvedValue({ items: [], error: 'network' });

    renderCart();
    await waitForAuthSubscription();

    await emitAuth('INITIAL_SESSION', 'user-1');

    // 게스트 카트가 그대로 보존되어야 함 (clearCart 미실행)
    expect(screen.getByTestId(`item-${A1}`)).toHaveTextContent(`${A1}:2`);
    const stored = JSON.parse(window.localStorage.getItem('saf:cart') ?? '[]');
    expect(stored).toEqual([{ artworkId: A1, quantity: 2 }]);
  });

  it('mergeGuestCart가 error 반환 → clearCart 안 하고 게스트 카트 보존', async () => {
    window.localStorage.setItem('saf:cart', JSON.stringify([{ artworkId: A1, quantity: 1 }]));
    mergeGuestCart.mockResolvedValue({ error: 'too_many' });
    getCartItems.mockResolvedValue({ items: [{ artworkId: DB_ITEM, quantity: 9 }] });

    renderCart();
    await waitForAuthSubscription();

    await emitAuth('INITIAL_SESSION', 'user-1');

    // 병합 에러 → DB값으로 교체하지 않고 게스트 보존
    expect(screen.getByTestId(`item-${A1}`)).toHaveTextContent(`${A1}:1`);
    expect(screen.queryByTestId(`item-${DB_ITEM}`)).not.toBeInTheDocument();
  });
});

describe('CartProvider — 로그아웃 / 신원 변경', () => {
  it('SIGNED_OUT → 카트 clear', async () => {
    window.localStorage.setItem('saf:cart', JSON.stringify([{ artworkId: A1, quantity: 2 }]));

    renderCart();
    await waitForAuthSubscription();

    // 먼저 로그인 상태로 진입(이후 SIGNED_OUT 효과를 명확히)
    getCartItems.mockResolvedValue({ items: [{ artworkId: DB_ITEM, quantity: 1 }] });
    await emitAuth('INITIAL_SESSION', 'user-1');
    await waitFor(() => expect(screen.getByTestId(`item-${DB_ITEM}`)).toBeInTheDocument());

    await emitAuth('SIGNED_OUT', null);

    expect(screen.queryByTestId(`item-${DB_ITEM}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    const stored = JSON.parse(window.localStorage.getItem('saf:cart') ?? '[]');
    expect(stored).toEqual([]);
  });

  it('신원 변경(다른 user id) → clear + 새 유저 DB 로드 (게스트 병합 안 함)', async () => {
    window.localStorage.setItem('saf:cart', JSON.stringify([{ artworkId: A1, quantity: 4 }]));

    renderCart();
    await waitForAuthSubscription();

    // user-1 로그인
    getCartItems.mockResolvedValueOnce({ items: [{ artworkId: DB_ITEM, quantity: 1 }] });
    await emitAuth('INITIAL_SESSION', 'user-1');
    await waitFor(() => expect(screen.getByTestId(`item-${DB_ITEM}`)).toBeInTheDocument());

    mergeGuestCart.mockClear();
    // user-2로 신원 변경
    getCartItems.mockResolvedValueOnce({ items: [{ artworkId: DB_ITEM_2, quantity: 7 }] });
    await emitAuth('SIGNED_IN', 'user-2');

    // 신원 변경 경로는 mergeGuestCart 호출하지 않음 (순수 DB 로드)
    expect(mergeGuestCart).not.toHaveBeenCalled();
    // 이전 유저 항목 제거 + 새 유저 DB 항목 로드
    await waitFor(() => {
      expect(screen.getByTestId(`item-${DB_ITEM_2}`)).toHaveTextContent(`${DB_ITEM_2}:7`);
    });
    expect(screen.queryByTestId(`item-${DB_ITEM}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('7');
  });

  it('신원 변경 중 getCartItems error → 새 유저 항목 미반영(이전 항목은 이미 clear됨)', async () => {
    renderCart();
    await waitForAuthSubscription();

    getCartItems.mockResolvedValueOnce({ items: [{ artworkId: DB_ITEM, quantity: 1 }] });
    await emitAuth('INITIAL_SESSION', 'user-1');
    await waitFor(() => expect(screen.getByTestId(`item-${DB_ITEM}`)).toBeInTheDocument());

    getCartItems.mockResolvedValueOnce({ items: [], error: 'boom' });
    await emitAuth('SIGNED_IN', 'user-2');

    // 신원 변경 시 즉시 clear 되며, 로드 에러로 새 항목은 채워지지 않음
    expect(screen.queryByTestId(`item-${DB_ITEM}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});

describe('CartProvider — 로그인 후 DB sync', () => {
  it('로그인 상태에서 addOne → upsertCartItem 호출', async () => {
    renderCart();
    await waitForAuthSubscription();

    // 로그인 (DB 비어있음)
    getCartItems.mockResolvedValue({ items: [] });
    await emitAuth('INITIAL_SESSION', 'user-1');

    upsertCartItem.mockClear();
    await act(async () => {
      screen.getByTestId(ADD_BTN).click();
    });

    expect(upsertCartItem).toHaveBeenCalledWith(A1, 1);
  });
});

describe('CartProvider — 언마운트', () => {
  it('언마운트 시 onAuthStateChange 구독 해제', async () => {
    const { unmount } = renderCart();
    await waitForAuthSubscription();

    unmount();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
