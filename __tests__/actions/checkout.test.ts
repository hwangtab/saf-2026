/**
 * checkout.ts Server Action 단위 테스트
 *
 * createOrder, cancelPendingOrder를
 * Supabase 모킹 기반으로 테스트합니다.
 */

import { TextDecoder, TextEncoder } from 'util';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { CreateOrderInput } from '@/app/actions/checkout';

if (typeof global.TextEncoder === 'undefined') {
  (global as typeof global & { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  (global as typeof global & { TextDecoder: typeof TextDecoder }).TextDecoder =
    TextDecoder as typeof global.TextDecoder;
}

// --- Mock: next/headers ---
// --- Import SUT ---

const mockHeadersGet = jest.fn();
const mockCookieSet = jest.fn();
const mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({
    get: mockHeadersGet,
  })),
  cookies: jest.fn(async () => ({
    set: mockCookieSet,
    get: mockCookieGet,
  })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

// --- Mock: next/server ---
// 테스트 환경에는 request scope가 없어 after()가 throw하므로, 콜백을 즉시 실행해 무력화
jest.mock('next/server', () => ({
  after: (cb: unknown) => (typeof cb === 'function' ? (cb as () => unknown)() : cb),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// --- Mock: rate-limit ---
let mockRateLimitResult = { success: true, remaining: 9 };
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(() => mockRateLimitResult),
}));

// --- Mock: Supabase ---
type MockResult = { data: unknown; error: unknown };

let mockArtworkResult: MockResult = { data: null, error: null };
let mockOrderSelectResult: MockResult = { data: null, error: null };
let mockRpcResult: MockResult = { data: null, error: null };
let mockCleanupRpcResult: MockResult = { data: 0, error: null };
// 다품목 재고 확인은 품목마다 RPC를 호출하므로 큐가 있으면 순서대로 소비.
let mockRpcResultsQueue: MockResult[] = [];
let mockInsertResult: MockResult = { data: null, error: null };
let mockInsertResultsQueue: MockResult[] = [];
let mockUpdateResult: MockResult = { data: null, error: null };
let mockAuthUserResult: MockResult = { data: { user: null }, error: null };
let mockOrderItemsInsertResult: MockResult = { data: null, error: null };
// createBankTransferOrder가 order_items를 다시 조회해 전 품목을 예약 처리하므로
// (.select('artwork_id, artworks(...)').eq('order_id', ...)) 그 결과를 모킹.
let mockOrderItemsSelectResult: MockResult = { data: null, error: null };
// artworks UPDATE 캡처 — reserve/restore가 어떤 작품에 어떤 status로 갔는지 검증용
const capturedArtworkUpdates: Array<{
  patch: Record<string, unknown>;
  filters: Array<{ column: string; value: unknown }>;
}> = [];
// 특정 artwork id의 UPDATE 결과를 개별 지정 (race 시나리오: 2번째 작품 0건 matched)
let mockArtworkUpdateById: Record<string, MockResult> = {};
const capturedInsertedRows: Array<Record<string, unknown>> = [];
const capturedOrderItemsInserts: Array<Array<Record<string, unknown>>> = [];
const capturedOrderDeletes: Array<{ column: string; value: unknown }> = [];
const capturedOrderUpdates: Array<{
  patch: Record<string, unknown>;
  filters: Array<{ op: 'eq' | 'lt'; column: string; value: unknown }>;
}> = [];
const capturedRpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockRpc = jest.fn();
const mockFetchWithTimeout = jest.fn();
const mockNotifyEmail = jest.fn(async () => {});
const mockSendBuyerEmail = jest.fn(async () => {});
const mockSendBuyerSms = jest.fn(async () => ({ ok: true, skipped: false }));
const mockGetOrderNotificationInfo = jest.fn(async () => ({
  orderId: 'order-1',
  orderNo: 'SAF-20260414-TEST',
  buyerName: '홍길동',
  buyerEmail: 'buyer@test.com',
  buyerPhone: '01012345678',
  shippingName: '홍길동',
  shippingPhone: '01012345678',
  shippingAddress: '서울시 강남구 101호',
  shippingMemo: '',
  artworkTitle: '봄의 정원',
  artistName: '김작가',
  itemAmount: 5_000_000,
  shippingAmount: 0,
  totalAmount: 5_000_000,
  locale: 'ko',
}));

const ROOT = process.cwd();
const readSource = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const BANK_TRANSFER_ENV_KEYS = [
  'BANK_TRANSFER_BANK_NAME',
  'BANK_TRANSFER_ACCOUNT_NUMBER',
  'BANK_TRANSFER_HOLDER_NAME',
  'BANK_TRANSFER_DEADLINE_HOURS',
] as const;

function buildChain(result: MockResult) {
  const single = jest.fn(() => result);
  // chain은 await로 직접 resolve(.in().eq() 일괄 조회)도, .single()/.maybeSingle()도 지원.
  const chain = {
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    single,
    maybeSingle: single,
    then: (resolve: (value: MockResult) => unknown) => resolve(result),
  };
  const select = jest.fn(() => chain);
  return { select, single, eqChain: chain.eq };
}

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'artworks') {
        // 일괄 조회(.in().eq() await)는 배열을, 단건(.maybeSingle())은 객체를 반환.
        // mockArtworkResult.data가 단일 객체면 await 경로에서 [object]로 래핑.
        const bulkData = Array.isArray(mockArtworkResult.data)
          ? mockArtworkResult.data
          : mockArtworkResult.data
            ? [mockArtworkResult.data]
            : mockArtworkResult.data;
        const chain = buildChain({ data: bulkData, error: mockArtworkResult.error });
        // .maybeSingle()/.single()은 원본(객체) 반환 — createBankTransferOrder edition fetch용
        chain.single.mockImplementation(() => mockArtworkResult);
        return {
          select: chain.select,
          update: jest.fn((patch: Record<string, unknown>) => {
            // .eq() 필터를 누적해 어떤 작품에 어떤 status 패치가 갔는지 캡처.
            // reserve 결과는 매칭된 id별로 다르게 줄 수 있어야 race 시나리오 테스트 가능.
            const call = {
              patch,
              filters: [] as Array<{ column: string; value: unknown }>,
            };
            capturedArtworkUpdates.push(call);
            const resolveResult = () => {
              const idFilter = call.filters.find((f) => f.column === 'id');
              const id = idFilter?.value as string | undefined;
              if (id && mockArtworkUpdateById[id]) return mockArtworkUpdateById[id];
              return mockUpdateResult;
            };
            const selectFn: jest.Mock = jest.fn(() => resolveResult());
            const eqChain: jest.Mock = jest.fn((column: string, value: unknown) => {
              call.filters.push({ column, value });
              return {
                eq: eqChain,
                select: selectFn,
                get then() {
                  const r = resolveResult();
                  return (resolve: (value: MockResult) => unknown) => resolve(r);
                },
              };
            });
            return { eq: eqChain };
          }),
        };
      }
      if (table === 'orders') {
        const insertSingle = jest.fn(() => {
          if (mockInsertResultsQueue.length > 0) {
            return mockInsertResultsQueue.shift();
          }
          return mockInsertResult;
        });
        const insertSelect = jest.fn(() => ({ single: insertSingle }));
        return {
          select: buildChain(mockOrderSelectResult).select,
          insert: jest.fn((row: Record<string, unknown>) => {
            capturedInsertedRows.push(row);
            return { select: insertSelect };
          }),
          update: jest.fn((patch: Record<string, unknown>) => {
            const call = {
              patch,
              filters: [] as Array<{ op: 'eq' | 'lt'; column: string; value: unknown }>,
            };
            capturedOrderUpdates.push(call);
            const chain = {
              eq: jest.fn((column: string, value: unknown) => {
                call.filters.push({ op: 'eq', column, value });
                return chain;
              }),
              lt: jest.fn((column: string, value: unknown) => {
                call.filters.push({ op: 'lt', column, value });
                return chain;
              }),
              ...mockUpdateResult,
            };
            return chain;
          }),
          delete: jest.fn(() => ({
            eq: jest.fn((column: string, value: unknown) => {
              capturedOrderDeletes.push({ column, value });
              return mockUpdateResult;
            }),
          })),
        };
      }
      if (table === 'order_items') {
        return {
          insert: jest.fn((rows: Array<Record<string, unknown>>) => {
            capturedOrderItemsInserts.push(rows);
            return mockOrderItemsInsertResult;
          }),
          // .select('artwork_id, artworks(...)').eq('order_id', ...) → await로 resolve
          select: jest.fn(() => ({
            eq: jest.fn(() => mockOrderItemsSelectResult),
          })),
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ eq: jest.fn(), single: jest.fn(), maybeSingle: jest.fn() })),
        })),
        update: jest.fn(() => ({ eq: jest.fn() })),
      };
    }),
    rpc: jest.fn((fn: string, args: Record<string, unknown>) => {
      capturedRpcCalls.push({ fn, args });
      if (fn === 'cancel_stale_pending_orders_for_buyer_artworks') {
        return mockCleanupRpcResult;
      }
      if (mockRpcResultsQueue.length > 0) {
        return mockRpcResultsQueue.shift();
      }
      return mockRpcResult;
    }),
  })),
  createSupabaseServerClient: jest.fn(async () => ({
    auth: {
      getUser: jest.fn(() => mockAuthUserResult),
    },
  })),
}));

// --- Mock: toss config ---
jest.mock('@/lib/integrations/toss/config', () => ({
  calculateShippingFee: jest.fn((amount: number) => (amount >= 200000 ? 0 : 4000)),
  getTossConfig: jest.fn(() => ({
    apiBaseUrl: 'https://api.tosspayments.test',
    provider: 'domestic',
  })),
  getTossAuthHeader: jest.fn(() => 'Basic test-secret'),
}));

jest.mock('@/lib/integrations/toss/fetch-with-timeout', () => ({
  fetchWithTimeout: (...args: unknown[]) => mockFetchWithTimeout(...args),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: (...args: unknown[]) => mockNotifyEmail(...args),
  sendBuyerEmail: (...args: unknown[]) => mockSendBuyerEmail(...args),
}));

jest.mock('@/lib/sms/buyer-sms', () => ({
  sendBuyerSms: (...args: unknown[]) => mockSendBuyerSms(...args),
}));

jest.mock('@/lib/utils/get-order-notification-info', () => ({
  getOrderNotificationInfo: (...args: unknown[]) => mockGetOrderNotificationInfo(...args),
  buildAdminNotificationFields: (_info: unknown, extras: Record<string, unknown>) => extras,
}));

// --- Mock: order number ---
jest.mock('@/lib/integrations/toss/order-number', () => ({
  generateOrderNumber: jest.fn(() => 'SAF-20260414-TEST'),
}));

// --- Mock: parsePrice ---
jest.mock('@/lib/parsePrice', () => ({
  parsePrice: jest.fn((v: string) => {
    const num = parseInt(String(v).replace(/[^\d]/g, ''), 10);
    return isNaN(num) || num === 0 ? Infinity : num;
  }),
}));

const validInput: CreateOrderInput = {
  artworkId: 'art-1',
  buyerName: '홍길동',
  buyerEmail: 'buyer@test.com',
  buyerPhone: '01012345678',
  shippingName: '홍길동',
  shippingPhone: '01012345678',
  shippingAddress: '서울시 강남구',
  shippingAddressDetail: '101호',
  shippingPostalCode: '06000',
  shippingMemo: '부재시 문앞',
};

function setupSuccessfulArtwork() {
  mockArtworkResult = {
    data: {
      id: 'art-1',
      title: '봄의 정원',
      price: '₩5,000,000',
      status: 'available',
      edition_type: 'unique',
      edition_limit: null,
      artists: { name_ko: '김작가' },
    },
    error: null,
  };
  mockRpcResult = { data: [{ is_available: true }], error: null };
  mockInsertResult = { data: { id: 'order-1' }, error: null };
  mockUpdateResult = { data: [{ id: 'art-1' }], error: null };
  // createBankTransferOrder의 전 품목 예약 루프가 참조 (단건 unique 작품)
  mockOrderItemsSelectResult = {
    data: [{ artwork_id: 'art-1', artworks: { edition_type: 'unique', status: 'available' } }],
    error: null,
  };
}

// ---------- Tests ----------

let createOrder: typeof import('@/app/actions/checkout').createOrder;
let cancelPendingOrder: typeof import('@/app/actions/checkout').cancelPendingOrder;
let cancelLandingOrder: typeof import('@/app/actions/checkout').cancelLandingOrder;
let initiatePayment: typeof import('@/app/actions/checkout').initiatePayment;
let createBankTransferOrder: typeof import('@/app/actions/checkout').createBankTransferOrder;
let verifyBankTransferLanding: typeof import('@/app/actions/checkout').verifyBankTransferLanding;

function hashCheckoutToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

beforeEach(async () => {
  jest.resetModules();
  mockHeadersGet.mockReturnValue('127.0.0.1');
  mockCookieSet.mockClear();
  mockCookieGet.mockReset();
  mockCookieGet.mockReturnValue(undefined);
  mockRateLimitResult = { success: true, remaining: 9 };
  mockArtworkResult = { data: null, error: null };
  mockOrderSelectResult = { data: null, error: null };
  mockRpcResult = { data: null, error: null };
  mockCleanupRpcResult = { data: 0, error: null };
  mockRpcResultsQueue = [];
  mockInsertResult = { data: null, error: null };
  mockInsertResultsQueue = [];
  mockUpdateResult = { data: null, error: null };
  mockAuthUserResult = { data: { user: null }, error: null };
  mockOrderItemsInsertResult = { data: null, error: null };
  mockOrderItemsSelectResult = { data: null, error: null };
  mockArtworkUpdateById = {};
  capturedArtworkUpdates.length = 0;
  capturedInsertedRows.length = 0;
  capturedOrderUpdates.length = 0;
  capturedOrderItemsInserts.length = 0;
  capturedOrderDeletes.length = 0;
  capturedRpcCalls.length = 0;
  mockFetchWithTimeout.mockReset();
  mockFetchWithTimeout.mockResolvedValue({
    ok: true,
    json: async () => ({ checkout: { url: 'https://checkout.tosspayments.test/pay' } }),
  });
  mockNotifyEmail.mockClear();
  mockSendBuyerEmail.mockClear();
  mockSendBuyerSms.mockClear();
  mockGetOrderNotificationInfo.mockClear();
  (jest.requireMock('next/navigation').redirect as jest.Mock).mockClear();
  for (const key of BANK_TRANSFER_ENV_KEYS) {
    delete process.env[key];
  }

  const mod = await import('@/app/actions/checkout');
  createOrder = mod.createOrder;
  cancelPendingOrder = mod.cancelPendingOrder;
  cancelLandingOrder = mod.cancelLandingOrder;
  initiatePayment = mod.initiatePayment;
  createBankTransferOrder = mod.createBankTransferOrder;
  verifyBankTransferLanding = mod.verifyBankTransferLanding;
});

// ========== createOrder ==========

describe('createOrder', () => {
  it('rate limit 초과 시 에러 반환', async () => {
    mockRateLimitResult = { success: false, remaining: 0 };
    const result = await createOrder(validInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('요청이 너무 많습니다');
    }
  });

  it('필수 필드 누락 시 에러 반환 (buyerName 없음)', async () => {
    const result = await createOrder({ ...validInput, buyerName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('필수 정보');
    }
  });

  it('배송지 정보 누락 시 에러 반환', async () => {
    const result = await createOrder({ ...validInput, shippingAddress: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('배송지');
    }
  });

  it('상세주소가 없어도 주문 생성 성공', async () => {
    setupSuccessfulArtwork();
    const result = await createOrder({ ...validInput, shippingAddressDetail: '' });

    expect(result.success).toBe(true);
    expect(capturedInsertedRows[0]).toMatchObject({
      shipping_address: validInput.shippingAddress,
      shipping_address_detail: null,
    });
  });

  it('작품 조회 실패 시 에러 반환', async () => {
    mockArtworkResult = { data: null, error: { message: 'not found' } };
    const result = await createOrder(validInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('작품을 찾을 수 없습니다');
    }
  });

  it('재고 확인 RPC 에러 시 에러 반환', async () => {
    mockArtworkResult = {
      data: { id: 'art-1', title: '봄', price: '₩5,000,000', artists: { name_ko: '김' } },
      error: null,
    };
    mockRpcResult = { data: null, error: { message: 'rpc error' } };
    const result = await createOrder(validInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('재고 확인');
    }
  });

  it('이미 판매된 작품일 때 에러 반환', async () => {
    mockArtworkResult = {
      data: { id: 'art-1', title: '봄', price: '₩5,000,000', artists: { name_ko: '김' } },
      error: null,
    };
    mockRpcResult = { data: [{ is_available: false }], error: null };
    const result = await createOrder(validInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('이미 판매된');
    }
  });

  it('FIX-7: limited edition 잔여 재고 초과 수량은 차단한다', async () => {
    // edition_limit=5, sold=3, pending=1 → 잔여 1. qty=3 요청 시 (3+1+3=7 > 5) 차단.
    mockArtworkResult = {
      data: {
        id: 'art-1',
        title: '한정판',
        price: '₩1,000,000',
        status: 'available',
        edition_type: 'limited',
        edition_limit: 5,
        artists: { name_ko: '김작가' },
      },
      error: null,
    };
    mockRpcResult = {
      data: [
        {
          is_available: true,
          artwork_edition_type: 'limited',
          artwork_edition_limit: 5,
          sold_count: 3,
          pending_count: 1,
        },
      ],
      error: null,
    };
    const result = await createOrder({
      ...validInput,
      artworkId: undefined,
      items: [{ artworkId: 'art-1', quantity: 3 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.unavailable).toEqual(['art-1']);
    }
  });

  it('FIX-7: limited edition 잔여 재고 이내 수량은 허용한다', async () => {
    // edition_limit=5, sold=1, pending=0 → 잔여 4. qty=3 요청 시 (1+0+3=4 <= 5) 허용.
    mockArtworkResult = {
      data: {
        id: 'art-1',
        title: '한정판',
        price: '₩1,000,000',
        status: 'available',
        edition_type: 'limited',
        edition_limit: 5,
        artists: { name_ko: '김작가' },
      },
      error: null,
    };
    mockRpcResult = {
      data: [
        {
          is_available: true,
          artwork_edition_type: 'limited',
          artwork_edition_limit: 5,
          sold_count: 1,
          pending_count: 0,
        },
      ],
      error: null,
    };
    mockInsertResult = { data: { id: 'order-1' }, error: null };
    const result = await createOrder({
      ...validInput,
      artworkId: undefined,
      items: [{ artworkId: 'art-1', quantity: 3 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // 단가 100만 × 3 = 300만 (배송비 4000 — 20만 미만 아님이라 무료? 300만이므로 무료)
      expect(result.totalAmount).toBe(3_000_000);
    }
  });

  it('성공 시 주문 정보 반환', async () => {
    setupSuccessfulArtwork();
    const result = await createOrder(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.orderId).toBe('order-1');
      expect(result.orderNo).toBe('SAF-20260414-TEST');
      expect(result.totalAmount).toBe(5_000_000); // 500만원 이상 → 배송비 무료
      expect(result.orderName).toContain('봄의 정원');
      expect(result.orderName).toContain('김작가');
      expect(result.checkoutToken).toEqual(expect.any(String));
      expect(result.checkoutToken.length).toBeGreaterThan(32);
    }
  });

  it('checkout token 원문은 응답하고 DB에는 해시만 저장한다', async () => {
    setupSuccessfulArtwork();

    const result = await createOrder(validInput);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const metadata = capturedInsertedRows[0].metadata as Record<string, unknown>;
    expect(metadata.checkout_token_hash).toBe(hashCheckoutToken(result.checkoutToken));
    expect(metadata.checkout_token_hash).not.toBe(result.checkoutToken);
    expect(JSON.stringify(capturedInsertedRows[0])).not.toContain(result.checkoutToken);
    expect(mockCookieSet).toHaveBeenCalledWith(
      `saf_checkout_${result.orderNo}`,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    );
  });

  it('기존 pending_payment 자동 정리는 30분 지난 주문만 대상으로 한다', async () => {
    setupSuccessfulArtwork();

    const result = await createOrder(validInput);

    expect(result.success).toBe(true);
    const cleanupCall = capturedRpcCalls.find(
      (call) => call.fn === 'cancel_stale_pending_orders_for_buyer_artworks'
    );
    expect(cleanupCall).toBeDefined();
    expect(cleanupCall?.args).toEqual(
      expect.objectContaining({
        p_buyer_email: validInput.buyerEmail,
        p_artwork_ids: [validInput.artworkId],
        p_cutoff: expect.any(String),
      })
    );
  });

  it('다품목 주문도 availability 확인 전에 stale pending cleanup RPC로 정리한다', async () => {
    mockArtworkResult = {
      data: [
        {
          id: 'art-1',
          title: '소품 A',
          price: '₩100,000',
          status: 'available',
          edition_type: 'limited',
          edition_limit: 10,
          artists: { name_ko: '김작가' },
        },
        {
          id: 'art-2',
          title: '소품 B',
          price: '₩50,000',
          status: 'available',
          edition_type: 'limited',
          edition_limit: 10,
          artists: { name_ko: '이작가' },
        },
      ],
      error: null,
    };
    mockRpcResultsQueue = [
      { data: [{ is_available: true }], error: null },
      { data: [{ is_available: true }], error: null },
    ];
    mockInsertResult = { data: { id: 'order-multi' }, error: null };

    const result = await createOrder({
      ...validInput,
      artworkId: undefined,
      items: [
        { artworkId: 'art-1', quantity: 1 },
        { artworkId: 'art-2', quantity: 1 },
      ],
    });

    expect(result.success).toBe(true);
    expect(capturedRpcCalls.map((call) => call.fn)).toEqual([
      'cancel_stale_pending_orders_for_buyer_artworks',
      'check_artwork_availability',
      'check_artwork_availability',
    ]);
    expect(capturedRpcCalls[0].args).toEqual(
      expect.objectContaining({
        p_buyer_email: validInput.buyerEmail,
        p_artwork_ids: ['art-1', 'art-2'],
      })
    );
    expect(capturedOrderUpdates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({ column: 'artwork_id' }),
            expect.objectContaining({ column: 'buyer_email' }),
          ]),
        }),
      ])
    );
  });

  it('stale pending cleanup RPC 실패 시 availability 확인 전에 중단한다', async () => {
    setupSuccessfulArtwork();
    mockCleanupRpcResult = { data: null, error: { message: 'cleanup failed' } };

    const result = await createOrder(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('재고 확인 중 오류가 발생했습니다');
    }
    expect(capturedRpcCalls.map((call) => call.fn)).toEqual([
      'cancel_stale_pending_orders_for_buyer_artworks',
    ]);
    expect(capturedInsertedRows).toHaveLength(0);
  });

  it('20만원 미만 작품은 배송비 4000원 추가', async () => {
    mockArtworkResult = {
      data: {
        id: 'art-1',
        title: '소품',
        price: '₩100,000',
        status: 'available',
        edition_type: 'unique',
        edition_limit: null,
        artists: { name_ko: '이작가' },
      },
      error: null,
    };
    mockRpcResult = { data: [{ is_available: true }], error: null };
    mockInsertResult = { data: { id: 'order-2' }, error: null };

    const result = await createOrder(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalAmount).toBe(104_000);
    }
  });

  it('주문 insert 실패 시 에러 반환', async () => {
    mockArtworkResult = {
      data: { id: 'art-1', title: '봄', price: '₩5,000,000', artists: { name_ko: '김' } },
      error: null,
    };
    mockRpcResult = { data: [{ is_available: true }], error: null };
    mockInsertResult = { data: null, error: { message: 'insert failed' } };
    const result = await createOrder(validInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('주문 생성');
    }
  });

  it('order_no UNIQUE 충돌 시 재시도 후 성공한다', async () => {
    setupSuccessfulArtwork();
    mockInsertResultsQueue = [
      {
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "orders_order_no_key"',
        },
      },
      {
        data: { id: 'order-retry' },
        error: null,
      },
    ];

    const orderNoMock = (
      jest.requireMock('@/lib/integrations/toss/order-number') as {
        generateOrderNumber: jest.Mock;
      }
    ).generateOrderNumber;
    orderNoMock
      .mockImplementationOnce(() => 'SAF-20260414-COLLIDE1')
      .mockImplementationOnce(() => 'SAF-20260414-COLLIDE2');

    const result = await createOrder(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.orderId).toBe('order-retry');
      expect(result.orderNo).toBe('SAF-20260414-COLLIDE2');
    }
    expect(orderNoMock).toHaveBeenCalledTimes(2);
  });

  it('unique edition 작품을 quantity 3으로 주문해도 order_items에는 quantity 1로 강제된다', async () => {
    const unitPrice = 3_000_000;
    mockArtworkResult = {
      data: {
        id: 'art-1',
        title: '유일작',
        price: `₩${unitPrice.toLocaleString('ko-KR')}`,
        status: 'available',
        edition_type: 'unique',
        edition_limit: null,
        artists: { name_ko: '박작가' },
      },
      error: null,
    };
    mockRpcResult = { data: [{ is_available: true }], error: null };
    mockInsertResult = { data: { id: 'order-unique-clamp' }, error: null };

    const result = await createOrder({
      ...validInput,
      artworkId: undefined,
      items: [{ artworkId: 'art-1', quantity: 3 }],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // order_items INSERT: quantity는 3이 아닌 1로 강제
    expect(capturedOrderItemsInserts).toHaveLength(1);
    expect(capturedOrderItemsInserts[0][0]).toMatchObject({
      artwork_id: 'art-1',
      quantity: 1,
      unit_price: unitPrice,
    });

    // orders row의 item_amount = 단가 × 1 (× 3이 아님)
    expect(capturedInsertedRows[0]).toMatchObject({
      item_amount: unitPrice * 1,
    });
  });
});

// ========== createOrder — multi-item (items[]) ==========

describe('createOrder — multi-item', () => {
  it('items 2건 정상 주문 → success, 합산 금액 + order_items INSERT', async () => {
    // 두 작품 (limited라 수량 반영). art-1 가격 100,000 x2, art-2 가격 50,000 x3.
    mockArtworkResult = {
      data: [
        {
          id: 'art-1',
          title: '소품 A',
          price: '₩100,000',
          status: 'available',
          edition_type: 'limited',
          edition_limit: 10,
          artists: { name_ko: '김작가' },
        },
        {
          id: 'art-2',
          title: '소품 B',
          price: '₩50,000',
          status: 'available',
          edition_type: 'limited',
          edition_limit: 10,
          artists: { name_ko: '이작가' },
        },
      ],
      error: null,
    };
    mockRpcResult = { data: [{ is_available: true }], error: null };
    mockInsertResult = { data: { id: 'order-multi' }, error: null };

    const result = await createOrder({
      ...validInput,
      artworkId: undefined,
      items: [
        { artworkId: 'art-1', quantity: 2 },
        { artworkId: 'art-2', quantity: 3 },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    // itemAmount = 100,000*2 + 50,000*3 = 350,000 (>= 200,000 → 배송비 0)
    expect(result.totalAmount).toBe(350_000);
    expect(result.orderName).toContain('외 1건');

    // orders row: artwork_id null, quantity 총합(5)
    expect(capturedInsertedRows[0]).toMatchObject({
      artwork_id: null,
      quantity: 5,
      item_amount: 350_000,
      total_amount: 350_000,
    });

    // order_items 2행 INSERT
    expect(capturedOrderItemsInserts).toHaveLength(1);
    expect(capturedOrderItemsInserts[0]).toEqual([
      { order_id: 'order-multi', artwork_id: 'art-1', quantity: 2, unit_price: 100_000 },
      { order_id: 'order-multi', artwork_id: 'art-2', quantity: 3, unit_price: 50_000 },
    ]);
  });

  it('items 중 1건 품절 → success:false + unavailable에 해당 id', async () => {
    mockArtworkResult = {
      data: [
        {
          id: 'art-1',
          title: '소품 A',
          price: '₩100,000',
          status: 'available',
          edition_type: 'limited',
          edition_limit: 10,
          artists: { name_ko: '김작가' },
        },
        {
          id: 'art-2',
          title: '소품 B',
          price: '₩50,000',
          status: 'sold_out',
          edition_type: 'limited',
          edition_limit: 10,
          artists: { name_ko: '이작가' },
        },
      ],
      error: null,
    };
    // 품목별 RPC 호출 순서대로 결과 반환: art-1 available, art-2 unavailable
    mockRpcResultsQueue = [
      { data: [{ is_available: true }], error: null },
      { data: [{ is_available: false }], error: null },
    ];

    const result = await createOrder({
      ...validInput,
      artworkId: undefined,
      items: [
        { artworkId: 'art-1', quantity: 1 },
        { artworkId: 'art-2', quantity: 1 },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.unavailable).toEqual(['art-2']);
    // 주문/품목이 생성되지 않아야 함
    expect(capturedInsertedRows).toHaveLength(0);
    expect(capturedOrderItemsInserts).toHaveLength(0);
  });

  it('order_items INSERT 실패 시 주문을 롤백한다', async () => {
    mockArtworkResult = {
      data: [
        {
          id: 'art-1',
          title: '소품 A',
          price: '₩300,000',
          status: 'available',
          edition_type: 'unique',
          edition_limit: null,
          artists: { name_ko: '김작가' },
        },
      ],
      error: null,
    };
    mockRpcResult = { data: [{ is_available: true }], error: null };
    mockInsertResult = { data: { id: 'order-rollback' }, error: null };
    mockOrderItemsInsertResult = { data: null, error: { message: 'items insert failed' } };

    const result = await createOrder({
      ...validInput,
      artworkId: undefined,
      items: [{ artworkId: 'art-1', quantity: 1 }],
    });

    expect(result.success).toBe(false);
    expect(capturedOrderDeletes).toEqual([{ column: 'id', value: 'order-rollback' }]);
  });
});

// ========== cancelPendingOrder ==========

describe('cancelPendingOrder', () => {
  it('빈 입력 시 아무것도 하지 않음', async () => {
    await cancelPendingOrder('', 'test@test.com');
    // 에러 없이 완료되면 성공
  });

  it('유효한 입력으로 호출 시 에러 없이 완료', async () => {
    await cancelPendingOrder('SAF-20260414-TEST', 'buyer@test.com');
    // 에러 없이 완료되면 성공
  });
});

// ========== cancelLandingOrder ==========

describe('cancelLandingOrder', () => {
  it('토큰이 없으면 주문을 취소하지 않음', async () => {
    await cancelLandingOrder('SAF-20260414-TEST', '');
    expect(capturedOrderUpdates).toHaveLength(0);
  });

  it('토큰이 있으면 checkout_token_hash 조건을 함께 걸어 pending 주문만 취소', async () => {
    await cancelLandingOrder('SAF-20260414-TEST', 'raw-token');

    expect(capturedOrderUpdates).toHaveLength(1);
    expect(capturedOrderUpdates[0].filters).toEqual(
      expect.arrayContaining([
        { op: 'eq', column: 'order_no', value: 'SAF-20260414-TEST' },
        { op: 'eq', column: 'status', value: 'pending_payment' },
        {
          op: 'eq',
          column: 'metadata->>checkout_token_hash',
          value: hashCheckoutToken('raw-token'),
        },
      ])
    );
  });
});

// ========== initiatePayment ==========

describe('initiatePayment', () => {
  const paymentInput = {
    method: 'CARD',
    orderNo: 'SAF-20260414-TEST',
    orderName: '봄의 정원 (김작가)',
    totalAmount: 5_000_000,
    buyerName: '홍길동',
    buyerEmail: 'buyer@test.com',
    checkoutToken: 'checkout-token',
    successUrl: 'https://www.saf2026.com/checkout/art-1/success?foo=1',
    failUrl: 'https://www.saf2026.com/checkout/art-1/fail',
    locale: 'ko' as const,
  };

  it('checkout token 불일치 시 Toss API 호출 없이 실패', async () => {
    mockOrderSelectResult = {
      data: {
        total_amount: 5_000_000,
        status: 'pending_payment',
        metadata: { checkout_token_hash: hashCheckoutToken('different-token') },
      },
      error: null,
    };

    const result = await initiatePayment(paymentInput);

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it('checkout token 일치 시 Toss redirect URL에 token을 싣지 않고 세션 생성', async () => {
    mockOrderSelectResult = {
      data: {
        total_amount: 5_000_000,
        status: 'pending_payment',
        metadata: { checkout_token_hash: hashCheckoutToken(paymentInput.checkoutToken) },
      },
      error: null,
    };

    const result = await initiatePayment(paymentInput);

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);
    const [, init] = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse((init as { body: string }).body) as {
      successUrl: string;
      failUrl: string;
    };
    expect(body.successUrl).toContain('foo=1');
    expect(body.successUrl).not.toContain('checkoutToken=');
    expect(body.failUrl).not.toContain('checkoutToken=');
  });
});

// ========== verifyBankTransferLanding ==========

describe('verifyBankTransferLanding', () => {
  it('checkout token 없는 legacy 주문은 manual_bank_transfer일 때만 허용하고 표시 계좌를 반환', async () => {
    mockOrderSelectResult = {
      data: {
        id: 'order-1',
        created_at: '2026-06-19T05:00:00.000Z',
        metadata: {
          locale: 'ko',
          payment_provider: 'manual_bank_transfer',
          bank_transfer: {
            bankName: '메타은행',
            accountNumber: '999-111',
            holderName: '메타 예금주',
            dueDate: '2026. 6. 20. 오후 2:00:00',
          },
        },
      },
      error: null,
    };

    await expect(verifyBankTransferLanding('SAF-20260414-TEST', '')).resolves.toEqual({
      ok: true,
      bankTransfer: {
        bankName: '메타은행',
        accountNumber: '999-111',
        holderName: '메타 예금주',
        dueDate: '2026. 6. 20. 오후 2:00:00',
      },
    });
  });

  it('checkout token 없는 legacy 카드 주문은 무통장 랜딩을 허용하지 않음', async () => {
    mockOrderSelectResult = {
      data: {
        id: 'order-1',
        metadata: { payment_provider: 'domestic' },
      },
      error: null,
    };

    await expect(verifyBankTransferLanding('SAF-20260414-TEST', '')).resolves.toEqual({
      ok: false,
    });
  });

  it('checkout token 보호 주문은 유효한 token일 때 fallback 계좌 표시값을 반환', async () => {
    process.env.BANK_TRANSFER_BANK_NAME = '운영은행';
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER = '777-888';
    process.env.BANK_TRANSFER_HOLDER_NAME = '운영 예금주';
    process.env.BANK_TRANSFER_DEADLINE_HOURS = '48';
    const expectedDueDate = new Date('2026-06-21T05:00:00.000Z').toLocaleString('en-US', {
      timeZone: 'Asia/Seoul',
    });
    mockOrderSelectResult = {
      data: {
        id: 'order-1',
        created_at: '2026-06-19T05:00:00.000Z',
        metadata: {
          locale: 'en',
          payment_provider: 'manual_bank_transfer',
          checkout_token_hash: hashCheckoutToken('valid-token'),
        },
      },
      error: null,
    };

    await expect(verifyBankTransferLanding('SAF-20260414-TEST', 'valid-token')).resolves.toEqual({
      ok: true,
      bankTransfer: {
        bankName: '운영은행',
        accountNumber: '777-888',
        holderName: '운영 예금주',
        dueDate: expectedDueDate,
      },
    });
  });

  it('checkout token 보호 주문은 invalid token을 거부', async () => {
    mockOrderSelectResult = {
      data: {
        id: 'order-1',
        created_at: '2026-06-19T05:00:00.000Z',
        metadata: {
          locale: 'ko',
          payment_provider: 'manual_bank_transfer',
          checkout_token_hash: hashCheckoutToken('valid-token'),
        },
      },
      error: null,
    };

    await expect(verifyBankTransferLanding('SAF-20260414-TEST', 'wrong-token')).resolves.toEqual({
      ok: false,
    });
  });
});

// ========== createOrder — payment_provider metadata ==========

describe('createOrder — payment_provider metadata', () => {
  it('stamps metadata.payment_provider = "domestic" for ko orders', async () => {
    setupSuccessfulArtwork();

    const result = await createOrder({
      ...validInput,
      locale: 'ko',
    });

    expect(result.success).toBe(true);
    expect(capturedInsertedRows).toHaveLength(1);
    const meta = capturedInsertedRows[0].metadata as Record<string, unknown>;
    expect(meta.payment_provider).toBe('domestic');
    expect(meta.locale).toBe('ko');
    expect(meta.checkout_token_hash).toEqual(expect.any(String));
  });

  it('stamps metadata.payment_provider = "overseas" for en orders', async () => {
    setupSuccessfulArtwork();

    const result = await createOrder({
      ...validInput,
      locale: 'en',
    });

    expect(result.success).toBe(true);
    const meta = capturedInsertedRows[0].metadata as Record<string, unknown>;
    expect(meta.payment_provider).toBe('overseas');
    expect(meta.locale).toBe('en');
    expect(meta.checkout_token_hash).toEqual(expect.any(String));
  });
});

// ========== createBankTransferOrder ==========

describe('createBankTransferOrder', () => {
  it('redirect success URL에 checkoutToken을 포함한다', async () => {
    setupSuccessfulArtwork();
    await expect(createBankTransferOrder(validInput)).rejects.toThrow(/NEXT_REDIRECT:/);

    const redirect = jest.requireMock('next/navigation').redirect as jest.Mock;
    const redirectedTo = redirect.mock.calls.at(-1)?.[0] as string;
    expect(redirectedTo).toContain('method=BANK_TRANSFER');
    expect(redirectedTo).toContain('checkoutToken=');

    const manualUpdate = capturedOrderUpdates.find((call) =>
      Boolean(
        (call.patch.metadata as Record<string, unknown> | undefined)?.payment_provider ===
          'manual_bank_transfer'
      )
    );
    expect((manualUpdate?.patch.metadata as Record<string, unknown>).checkout_token_hash).toEqual(
      expect.any(String)
    );
  });

  it('env override 계좌정보를 metadata와 buyer/admin 알림 payload에 동일하게 사용한다', async () => {
    process.env.BANK_TRANSFER_BANK_NAME = '신한은행';
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER = '110-000-000000';
    process.env.BANK_TRANSFER_HOLDER_NAME = '씨앗페';
    process.env.BANK_TRANSFER_DEADLINE_HOURS = '36';
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-06-19T05:00:00.000Z').getTime());
    const expectedDueDate = new Date('2026-06-20T17:00:00.000Z').toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
    });
    setupSuccessfulArtwork();

    try {
      await expect(createBankTransferOrder(validInput)).rejects.toThrow(/NEXT_REDIRECT:/);
    } finally {
      nowSpy.mockRestore();
    }

    const manualUpdate = capturedOrderUpdates.find((call) =>
      Boolean(
        (call.patch.metadata as Record<string, unknown> | undefined)?.payment_provider ===
          'manual_bank_transfer'
      )
    );
    expect(manualUpdate?.patch.metadata).toEqual(
      expect.objectContaining({
        bank_transfer: {
          bankName: '신한은행',
          accountNumber: '110-000-000000',
          holderName: '씨앗페',
          dueDate: expectedDueDate,
          dueDateIso: '2026-06-20T17:00:00.000Z',
        },
      })
    );
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'info',
      '계좌이체 주문 접수 (입금 대기)',
      expect.objectContaining({
        은행: '신한은행',
        계좌번호: '110-000-000000',
        예금주: '씨앗페',
        입금기한: expectedDueDate,
      })
    );
    expect(mockSendBuyerEmail).toHaveBeenCalledWith(
      'buyer@test.com',
      'virtual_account_issued',
      expect.objectContaining({
        virtualAccount: {
          bankName: '신한은행',
          accountNumber: '110-000-000000',
          dueDate: expectedDueDate,
        },
      }),
      'ko'
    );
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      validInput.buyerPhone,
      'virtual_account_issued',
      expect.objectContaining({
        virtualAccount: {
          bankName: '신한은행',
          accountNumber: '110-000-000000',
          holderName: '씨앗페',
          dueDate: expectedDueDate,
        },
      }),
      'ko',
      'SAF-20260414-TEST'
    );
  });

  it('FIX-5: 다품목 무통장 주문은 모든 unique 작품을 reserved 처리한다', async () => {
    // 카트(다품목) 무통장 — createOrder 정규화 결과를 흉내내기 위해 일괄 조회/RPC를 다품목으로 셋업.
    mockArtworkResult = {
      data: [
        {
          id: 'art-1',
          title: '봄의 정원',
          price: '₩5,000,000',
          status: 'available',
          edition_type: 'unique',
          edition_limit: null,
          artists: { name_ko: '김작가' },
        },
        {
          id: 'art-2',
          title: '여름의 바다',
          price: '₩3,000,000',
          status: 'available',
          edition_type: 'unique',
          edition_limit: null,
          artists: { name_ko: '이작가' },
        },
      ],
      error: null,
    };
    mockRpcResultsQueue = [
      { data: [{ is_available: true }], error: null },
      { data: [{ is_available: true }], error: null },
    ];
    mockInsertResult = { data: { id: 'order-1' }, error: null };
    mockUpdateResult = { data: [{ id: 'reserved' }], error: null };
    // createBankTransferOrder가 다시 조회하는 order_items — 두 unique 작품
    mockOrderItemsSelectResult = {
      data: [
        { artwork_id: 'art-1', artworks: { edition_type: 'unique', status: 'available' } },
        { artwork_id: 'art-2', artworks: { edition_type: 'unique', status: 'available' } },
      ],
      error: null,
    };

    await expect(
      createBankTransferOrder({
        ...validInput,
        artworkId: undefined,
        items: [{ artworkId: 'art-1' }, { artworkId: 'art-2' }],
        cartCheckout: true,
      })
    ).rejects.toThrow(/NEXT_REDIRECT:/);

    // 두 작품 모두 reserved 패치 + available 가드가 적용됐는지 검증
    const reserveCalls = capturedArtworkUpdates.filter((c) => c.patch.status === 'reserved');
    const reservedIds = reserveCalls.map(
      (c) => c.filters.find((f) => f.column === 'id')?.value as string
    );
    expect(reservedIds).toEqual(expect.arrayContaining(['art-1', 'art-2']));
    for (const c of reserveCalls) {
      expect(c.filters).toEqual(expect.arrayContaining([{ column: 'status', value: 'available' }]));
    }

    // 카트 결제는 /checkout/success 로 redirect
    const redirect = jest.requireMock('next/navigation').redirect as jest.Mock;
    const redirectedTo = redirect.mock.calls.at(-1)?.[0] as string;
    expect(redirectedTo).toContain('/checkout/success');
  });

  it('FIX-5: 2번째 unique 작품 예약 실패(레이스) 시 1번째 작품을 롤백하고 주문 취소', async () => {
    mockArtworkResult = {
      data: [
        {
          id: 'art-1',
          title: '봄의 정원',
          price: '₩5,000,000',
          status: 'available',
          edition_type: 'unique',
          edition_limit: null,
          artists: { name_ko: '김작가' },
        },
        {
          id: 'art-2',
          title: '여름의 바다',
          price: '₩3,000,000',
          status: 'available',
          edition_type: 'unique',
          edition_limit: null,
          artists: { name_ko: '이작가' },
        },
      ],
      error: null,
    };
    mockRpcResultsQueue = [
      { data: [{ is_available: true }], error: null },
      { data: [{ is_available: true }], error: null },
    ];
    mockInsertResult = { data: { id: 'order-1' }, error: null };
    mockOrderItemsSelectResult = {
      data: [
        { artwork_id: 'art-1', artworks: { edition_type: 'unique', status: 'available' } },
        { artwork_id: 'art-2', artworks: { edition_type: 'unique', status: 'available' } },
      ],
      error: null,
    };
    // art-1 예약 성공(1건), art-2는 레이스로 0건 matched → abort 트리거
    mockArtworkUpdateById = {
      'art-1': { data: [{ id: 'art-1' }], error: null },
      'art-2': { data: [], error: null },
    };

    const result = await createBankTransferOrder({
      ...validInput,
      artworkId: undefined,
      items: [{ artworkId: 'art-1' }, { artworkId: 'art-2' }],
      cartCheckout: true,
    });

    expect(result.success).toBe(false);

    // art-1을 reserved로 바꾼 뒤, 롤백으로 available 복원 패치가 있어야 한다
    const art1Reserve = capturedArtworkUpdates.find(
      (c) =>
        c.patch.status === 'reserved' &&
        c.filters.some((f) => f.column === 'id' && f.value === 'art-1')
    );
    const art1Rollback = capturedArtworkUpdates.find(
      (c) =>
        c.patch.status === 'available' &&
        c.filters.some((f) => f.column === 'id' && f.value === 'art-1') &&
        c.filters.some((f) => f.column === 'status' && f.value === 'reserved')
    );
    expect(art1Reserve).toBeTruthy();
    expect(art1Rollback).toBeTruthy();

    // 주문은 cancelled 처리
    const cancelled = capturedOrderUpdates.find((c) => c.patch.status === 'cancelled');
    expect(cancelled).toBeTruthy();
  });
});

describe('bank transfer success clients', () => {
  it('수동 계좌이체 화면은 server action 반환 payload를 렌더링하고 catalog 값/date-now fallback을 쓰지 않는다', () => {
    for (const rel of [
      'app/[locale]/checkout/success/SuccessClient.tsx',
      'app/[locale]/checkout/[artworkId]/success/SuccessClient.tsx',
    ]) {
      const src = readSource(rel);
      expect(src).toContain('setBankTransfer');
      expect(src).toContain('verification.bankTransfer');
      expect(src).toContain('bankTransfer.bankName');
      expect(src).toContain('bankTransfer.accountNumber');
      expect(src).toContain('bankTransfer.holderName');
      expect(src).toContain('bankTransfer.dueDate');
      expect(src).not.toContain("t('bankTransferBank')");
      expect(src).not.toContain("t('bankTransferAccount')");
      expect(src).not.toContain("t('bankTransferHolderName')");
      expect(src).not.toContain('Date.now() + 24 * 60 * 60 * 1000');
      expect(src).not.toContain('@/lib/payments/bank-transfer-info');
    }
  });
});
