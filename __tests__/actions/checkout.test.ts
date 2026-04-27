/**
 * checkout.ts Server Action 단위 테스트
 *
 * createOrder, cancelPendingOrder를
 * Supabase 모킹 기반으로 테스트합니다.
 */

import { TextDecoder, TextEncoder } from 'util';
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
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({
    get: mockHeadersGet,
  })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

// --- Mock: rate-limit ---
let mockRateLimitResult = { success: true, remaining: 9 };
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(() => mockRateLimitResult),
}));

// --- Mock: Supabase ---
type MockResult = { data: unknown; error: unknown };

let mockArtworkResult: MockResult = { data: null, error: null };
let mockRpcResult: MockResult = { data: null, error: null };
let mockInsertResult: MockResult = { data: null, error: null };
let mockInsertResultsQueue: MockResult[] = [];
let mockUpdateResult: MockResult = { data: null, error: null };
let mockAuthUserResult: MockResult = { data: { user: null }, error: null };
const capturedInsertedRows: Array<Record<string, unknown>> = [];

const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockRpc = jest.fn();

function buildChain(result: MockResult) {
  const single = jest.fn(() => result);
  const eqChain: jest.Mock = jest.fn(() => ({ eq: eqChain, single, maybeSingle: single }));
  const select = jest.fn(() => ({ eq: eqChain, single, maybeSingle: single }));
  return { select, single, eqChain };
}

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'artworks') {
        const chain = buildChain(mockArtworkResult);
        return {
          select: chain.select,
          update: jest.fn(() => {
            const selectFn: jest.Mock = jest.fn(() => mockUpdateResult);
            const eqChain: jest.Mock = jest.fn(() => ({
              eq: eqChain,
              select: selectFn,
              ...mockUpdateResult,
            }));
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
        const updateEq: jest.Mock = jest.fn(() => ({ eq: updateEq, ...mockUpdateResult }));
        return {
          select: buildChain(mockArtworkResult).select,
          insert: jest.fn((row: Record<string, unknown>) => {
            capturedInsertedRows.push(row);
            return { select: insertSelect };
          }),
          update: jest.fn(() => ({ eq: updateEq })),
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ eq: jest.fn(), single: jest.fn(), maybeSingle: jest.fn() })),
        })),
        update: jest.fn(() => ({ eq: jest.fn() })),
      };
    }),
    rpc: jest.fn(() => mockRpcResult),
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
}

// ---------- Tests ----------

let createOrder: typeof import('@/app/actions/checkout').createOrder;
let cancelPendingOrder: typeof import('@/app/actions/checkout').cancelPendingOrder;

beforeEach(async () => {
  jest.resetModules();
  mockHeadersGet.mockReturnValue('127.0.0.1');
  mockRateLimitResult = { success: true, remaining: 9 };
  mockArtworkResult = { data: null, error: null };
  mockRpcResult = { data: null, error: null };
  mockInsertResult = { data: null, error: null };
  mockInsertResultsQueue = [];
  mockUpdateResult = { data: null, error: null };
  mockAuthUserResult = { data: { user: null }, error: null };
  capturedInsertedRows.length = 0;

  const mod = await import('@/app/actions/checkout');
  createOrder = mod.createOrder;
  cancelPendingOrder = mod.cancelPendingOrder;
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
    }
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

// ========== createOrder — payment_provider metadata ==========

describe('createOrder — payment_provider metadata', () => {
  it('stamps metadata.payment_provider = "widget" on insert', async () => {
    setupSuccessfulArtwork();

    const result = await createOrder({
      ...validInput,
      locale: 'ko',
    });

    expect(result.success).toBe(true);
    expect(capturedInsertedRows).toHaveLength(1);
    const meta = capturedInsertedRows[0].metadata as Record<string, unknown>;
    expect(meta.payment_provider).toBe('widget');
    expect(meta.locale).toBe('ko');
  });
});
