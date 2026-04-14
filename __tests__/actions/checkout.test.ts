/**
 * checkout.ts Server Action 단위 테스트
 *
 * createOrder, initiatePayment, createBankTransferOrder, cancelPendingOrder를
 * Supabase 모킹 기반으로 테스트합니다.
 */

// --- Mock: next/headers ---
// --- Import SUT ---
import type { CreateOrderInput } from '@/app/actions/checkout';

const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({
    get: mockHeadersGet,
  })),
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
let mockUpdateResult: MockResult = { data: null, error: null };
let mockAuthUserResult: MockResult = { data: { user: null }, error: null };

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
            const eqChain: jest.Mock = jest.fn(() => ({ eq: eqChain, ...mockUpdateResult }));
            return { eq: eqChain };
          }),
        };
      }
      if (table === 'orders') {
        const insertSingle = jest.fn(() => mockInsertResult);
        const insertSelect = jest.fn(() => ({ single: insertSingle }));
        const updateEq: jest.Mock = jest.fn(() => ({ eq: updateEq, ...mockUpdateResult }));
        return {
          select: buildChain(mockArtworkResult).select,
          insert: jest.fn(() => ({ select: insertSelect })),
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
  getTossAuthHeader: jest.fn(() => 'Basic dGVzdDo='),
  TOSS_API_BASE_URL: 'https://api.tosspayments.com',
}));

// --- Mock: toss fetch ---
let mockFetchResponse: { ok: boolean; json: () => Promise<unknown> } | null = null;
let mockFetchShouldThrow = false;
jest.mock('@/lib/integrations/toss/fetch-with-timeout', () => ({
  fetchWithTimeout: jest.fn(async () => {
    if (mockFetchShouldThrow) throw new Error('network error');
    return mockFetchResponse;
  }),
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
}

// ---------- Tests ----------

let createOrder: typeof import('@/app/actions/checkout').createOrder;
let initiatePayment: typeof import('@/app/actions/checkout').initiatePayment;
let createBankTransferOrder: typeof import('@/app/actions/checkout').createBankTransferOrder;
let cancelPendingOrder: typeof import('@/app/actions/checkout').cancelPendingOrder;

beforeEach(async () => {
  jest.resetModules();
  mockHeadersGet.mockReturnValue('127.0.0.1');
  mockRateLimitResult = { success: true, remaining: 9 };
  mockArtworkResult = { data: null, error: null };
  mockRpcResult = { data: null, error: null };
  mockInsertResult = { data: null, error: null };
  mockUpdateResult = { data: null, error: null };
  mockAuthUserResult = { data: { user: null }, error: null };
  mockFetchResponse = null;
  mockFetchShouldThrow = false;

  const mod = await import('@/app/actions/checkout');
  createOrder = mod.createOrder;
  initiatePayment = mod.initiatePayment;
  createBankTransferOrder = mod.createBankTransferOrder;
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
});

// ========== initiatePayment ==========

describe('initiatePayment', () => {
  const paymentInput = {
    method: '카드',
    orderNo: 'SAF-20260414-TEST',
    orderName: '봄의 정원 (김작가)',
    totalAmount: 5_000_000,
    buyerName: '홍길동',
    buyerEmail: 'buyer@test.com',
    successUrl: 'http://localhost:3000/checkout/success',
    failUrl: 'http://localhost:3000/checkout/fail',
  };

  it('결제 서버 연결 실패 시 에러 반환', async () => {
    mockFetchShouldThrow = true;
    const result = await initiatePayment(paymentInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('결제 서버 연결');
    }
  });

  it('Toss API 에러 응답 시 에러 반환', async () => {
    mockFetchResponse = {
      ok: false,
      json: async () => ({ code: 'INVALID_REQUEST', message: '잘못된 요청' }),
    };
    const result = await initiatePayment(paymentInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('잘못된 요청');
    }
  });

  it('checkout URL 없는 응답 시 에러 반환', async () => {
    mockFetchResponse = {
      ok: true,
      json: async () => ({ checkout: {} }),
    };
    const result = await initiatePayment(paymentInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('결제 URL');
    }
  });

  it('성공 시 checkout URL 반환', async () => {
    mockFetchResponse = {
      ok: true,
      json: async () => ({ checkout: { url: 'https://pay.toss/checkout/abc' } }),
    };
    const result = await initiatePayment(paymentInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.checkoutUrl).toBe('https://pay.toss/checkout/abc');
    }
  });
});

// ========== createBankTransferOrder ==========

describe('createBankTransferOrder', () => {
  it('createOrder 실패 시 그대로 에러 전파', async () => {
    mockArtworkResult = { data: null, error: { message: 'not found' } };
    const result = await createBankTransferOrder(validInput);
    expect(result.success).toBe(false);
  });

  it('성공 시 주문 생성 후 상태 업데이트', async () => {
    setupSuccessfulArtwork();
    const result = await createBankTransferOrder(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.orderNo).toBe('SAF-20260414-TEST');
    }
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
