/**
 * cart.ts Server Action 단위 테스트
 *
 * getCartItems, upsertCartItem, removeCartItem, clearCartItems, mergeGuestCart를
 * Supabase 모킹 기반으로 테스트합니다.
 *
 * @jest-environment node
 */

const VALID_UUID = 'e637bb45-e888-443b-8f2e-8911c79d9ba7';

// --- Supabase mock state ---
type MockResult = { data: unknown; error: unknown };

let mockUpsertResult: MockResult = { data: null, error: null };
let mockDeleteResult: MockResult = { data: null, error: null };
let mockSelectResult: MockResult = { data: [], error: null };
let mockUser: { id: string } | null = { id: 'user-123' };

// Track calls for argument assertions
const upsertSpy = jest.fn();
const deleteSpy = jest.fn();
const selectSpy = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: jest.fn(async () => ({
    auth: {
      getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })),
    },
    from: jest.fn((_table: string) => ({
      select: jest.fn((_cols: string) => {
        selectSpy(_cols);
        return {
          eq: jest.fn(() => ({
            eq: jest.fn(() => mockSelectResult),
            ...mockSelectResult,
          })),
          ...mockSelectResult,
        };
      }),
      upsert: jest.fn((rows: unknown, opts: unknown) => {
        upsertSpy(rows, opts);
        return mockUpsertResult;
      }),
      delete: jest.fn(() => {
        deleteSpy();
        return {
          eq: jest.fn(() => ({
            eq: jest.fn(() => mockDeleteResult),
            ...mockDeleteResult,
          })),
          ...mockDeleteResult,
        };
      }),
    })),
  })),
}));

// --- Import SUT ---
let upsertCartItem: typeof import('@/app/actions/cart').upsertCartItem;
let removeCartItem: typeof import('@/app/actions/cart').removeCartItem;
let clearCartItems: typeof import('@/app/actions/cart').clearCartItems;
let mergeGuestCart: typeof import('@/app/actions/cart').mergeGuestCart;
let getCartItems: typeof import('@/app/actions/cart').getCartItems;

beforeEach(async () => {
  jest.resetModules();
  mockUser = { id: 'user-123' };
  mockUpsertResult = { data: null, error: null };
  mockDeleteResult = { data: null, error: null };
  mockSelectResult = { data: [], error: null };
  upsertSpy.mockClear();
  deleteSpy.mockClear();
  selectSpy.mockClear();

  const mod = await import('@/app/actions/cart');
  upsertCartItem = mod.upsertCartItem;
  removeCartItem = mod.removeCartItem;
  clearCartItems = mod.clearCartItems;
  mergeGuestCart = mod.mergeGuestCart;
  getCartItems = mod.getCartItems;
});

// ========== upsertCartItem ==========

describe('upsertCartItem', () => {
  it('비-uuid artworkId → invalid_id 반환', async () => {
    const result = await upsertCartItem('35', 1);
    expect(result).toEqual({ error: 'invalid_id' });
  });

  it('숫자형 문자열 id → invalid_id 반환', async () => {
    const result = await upsertCartItem('12345', 2);
    expect(result).toEqual({ error: 'invalid_id' });
  });

  it('quantity=0 → invalid_quantity 반환', async () => {
    const result = await upsertCartItem(VALID_UUID, 0);
    expect(result).toEqual({ error: 'invalid_quantity' });
  });

  it('음수 quantity → invalid_quantity 반환', async () => {
    const result = await upsertCartItem(VALID_UUID, -1);
    expect(result).toEqual({ error: 'invalid_quantity' });
  });

  it('소수 quantity → invalid_quantity 반환', async () => {
    const result = await upsertCartItem(VALID_UUID, 1.5);
    expect(result).toEqual({ error: 'invalid_quantity' });
  });

  it('비로그인 → unauthenticated 반환', async () => {
    mockUser = null;
    const result = await upsertCartItem(VALID_UUID, 1);
    expect(result).toEqual({ error: 'unauthenticated' });
  });

  it('로그인 + 유효 인자 → {} 반환', async () => {
    mockUpsertResult = { data: null, error: null };
    const result = await upsertCartItem(VALID_UUID, 2);
    expect(result).toEqual({});
  });

  it('로그인 성공 시 upsert 호출 인자 검증', async () => {
    mockUpsertResult = { data: null, error: null };
    await upsertCartItem(VALID_UUID, 3);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const [rows, opts] = upsertSpy.mock.calls[0];
    expect(rows).toMatchObject({ user_id: 'user-123', artwork_id: VALID_UUID, quantity: 3 });
    expect(opts).toEqual({ onConflict: 'user_id,artwork_id' });
  });

  it('DB 에러 → error.message 반환', async () => {
    mockUpsertResult = { data: null, error: { message: 'db_error' } };
    const result = await upsertCartItem(VALID_UUID, 1);
    expect(result).toEqual({ error: 'db_error' });
  });
});

// ========== removeCartItem ==========

describe('removeCartItem', () => {
  it('비-uuid artworkId → invalid_id 반환', async () => {
    const result = await removeCartItem('not-a-uuid');
    expect(result).toEqual({ error: 'invalid_id' });
  });

  it('비로그인 → unauthenticated 반환', async () => {
    mockUser = null;
    const result = await removeCartItem(VALID_UUID);
    expect(result).toEqual({ error: 'unauthenticated' });
  });

  it('로그인 + 유효 uuid → {} 반환', async () => {
    const result = await removeCartItem(VALID_UUID);
    expect(result).toEqual({});
  });
});

// ========== clearCartItems ==========

describe('clearCartItems', () => {
  it('비로그인 → unauthenticated 반환', async () => {
    mockUser = null;
    const result = await clearCartItems();
    expect(result).toEqual({ error: 'unauthenticated' });
  });

  it('로그인 → {} 반환', async () => {
    const result = await clearCartItems();
    expect(result).toEqual({});
  });
});

// ========== mergeGuestCart ==========

describe('mergeGuestCart', () => {
  it('빈 배열 → {} (DB 미호출)', async () => {
    const result = await mergeGuestCart([]);
    expect(result).toEqual({});
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('모든 항목이 invalid uuid → {} (valid 0건 조기 반환)', async () => {
    const result = await mergeGuestCart([
      { artworkId: '35', quantity: 1 },
      { artworkId: 'bad-id', quantity: 2 },
    ]);
    expect(result).toEqual({});
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('101건 초과 → too_many 반환', async () => {
    // 유효 UUID 항목을 101개 넣어 MAX_CART_BATCH(100) 초과 확인
    const items = Array.from({ length: 101 }, () => ({
      artworkId: VALID_UUID,
      quantity: 1,
    }));
    const result = await mergeGuestCart(items);
    expect(result).toEqual({ error: 'too_many' });
  });

  it('비로그인 → unauthenticated 반환', async () => {
    mockUser = null;
    const result = await mergeGuestCart([{ artworkId: VALID_UUID, quantity: 1 }]);
    expect(result).toEqual({ error: 'unauthenticated' });
  });

  it('유효 항목 병합 성공 → {}', async () => {
    const result = await mergeGuestCart([{ artworkId: VALID_UUID, quantity: 2 }]);
    expect(result).toEqual({});
    expect(upsertSpy).toHaveBeenCalledTimes(1);
  });

  it('quantity=0 항목은 필터링되고 나머지 유효 항목만 병합', async () => {
    const result = await mergeGuestCart([
      { artworkId: VALID_UUID, quantity: 0 },
      { artworkId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', quantity: 1 },
    ]);
    expect(result).toEqual({});
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const [rows] = upsertSpy.mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0].artwork_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });
});

// ========== getCartItems ==========

describe('getCartItems', () => {
  it('비로그인 → items:[] + error:unauthenticated', async () => {
    mockUser = null;
    const result = await getCartItems();
    expect(result).toEqual({ items: [], error: 'unauthenticated' });
  });

  it('DB 에러 → items:[] + error 메시지', async () => {
    mockSelectResult = { data: null, error: { message: 'select_error' } };
    const result = await getCartItems();
    expect(result.items).toEqual([]);
    expect(result.error).toBe('select_error');
  });

  it('로그인 + 데이터 없음 → items:[]', async () => {
    mockSelectResult = { data: [], error: null };
    const result = await getCartItems();
    expect(result).toEqual({ items: [] });
  });
});
