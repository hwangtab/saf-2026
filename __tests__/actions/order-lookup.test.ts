/**
 * order-lookup.ts Server Action 단위 테스트
 *
 * lookupOrders, lookupOrderDetail, updateBuyerShipping, cancelBuyerOrder를
 * Supabase 모킹 기반으로 테스트합니다.
 *
 * @jest-environment node
 */

// --- Mock: next/headers ---
const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({
    get: mockHeadersGet,
  })),
}));

// --- Mock: next/cache ---
// 테스트 환경에서는 revalidatePath/revalidateTag가 request scope를 요구해 throw하므로 무력화
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

// --- Mock: rate-limit ---
let mockRateLimitResult = { success: true, remaining: 9 };
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(() => mockRateLimitResult),
}));

// --- Mock: toss cancel ---
let mockCancelResult: { success: boolean; error?: unknown } = { success: true };
jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: jest.fn(async () => mockCancelResult),
}));

// --- Mock: deriveAndSyncArtworkStatus ---
jest.mock('@/app/actions/admin-artworks', () => ({
  deriveAndSyncArtworkStatus: jest.fn(async () => {}),
}));

// --- Mock: notify ---
jest.mock('@/lib/notify', () => ({
  notifyEmail: jest.fn(async () => {}),
  sendBuyerEmail: jest.fn(async () => {}),
  extractBuyerLocale: jest.fn(() => 'ko'),
}));

// --- Mock: get-order-notification-info ---
jest.mock('@/lib/utils/get-order-notification-info', () => ({
  getOrderNotificationInfo: jest.fn(async () => ({
    orderId: 'order-id',
    orderNo: 'SAF-20260417-0001',
    buyerName: '구매자',
    buyerEmail: 'buyer@example.com',
    buyerPhone: '010-0000-0000',
    shippingName: '수령인',
    shippingPhone: '010-1111-1111',
    shippingAddress: '서울시 종로구',
    shippingMemo: '',
    artworkTitle: '봄의 정원',
    artistName: '김작가',
    itemAmount: 100000,
    shippingAmount: 5000,
    totalAmount: 105000,
    locale: 'ko',
  })),
  buildAdminNotificationFields: jest.fn(() => ({})),
}));

// --- Mock: Supabase ---
type MockResult = { data: unknown; error: unknown };

// 테이블별 결과를 설정할 수 있는 구조
let mockOrdersSelectResult: MockResult = { data: null, error: null };
let mockOrdersSingleResult: MockResult = { data: null, error: null };
let mockPhoneVerifiedResult: MockResult = { data: null, error: null };
let mockPaymentResult: MockResult = { data: null, error: null };
let mockSaleResult: MockResult = { data: null, error: null };
let mockOrderUpdateError: unknown = null;
let mockPaymentUpdateError: unknown = null;

// 호출 순서에 따라 다른 결과 반환을 위한 카운터
let ordersSelectCallCount = 0;

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => {
    ordersSelectCallCount = 0;
    return {
      from: jest.fn((table: string) => {
        if (table === 'orders') {
          return createOrdersMock();
        }
        if (table === 'payments') {
          return createPaymentsMock();
        }
        if (table === 'artwork_sales') {
          return createSalesMock();
        }
        return createDefaultMock();
      }),
    };
  }),
}));

function createOrdersMock() {
  const makeMaybeSingle = (result: MockResult) => jest.fn(() => result);
  const makeOrder = (result: MockResult) =>
    jest.fn(() => ({
      ascending: jest.fn(),
      ...result,
    }));

  return {
    select: jest.fn(() => {
      ordersSelectCallCount++;
      const currentResult =
        ordersSelectCallCount <= 1 ? mockOrdersSelectResult : mockPhoneVerifiedResult;

      const neq = jest.fn(() => ({
        order: jest.fn(() => currentResult),
        // phone verification 쿼리용 — neq가 마지막
        ...currentResult,
      }));
      const ilike = jest.fn(() => ({ neq }));
      const eq: jest.Mock = jest.fn(() => ({
        eq,
        ilike,
        neq,
        maybeSingle: makeMaybeSingle(mockOrdersSingleResult),
      }));
      return {
        eq,
        ilike,
        maybeSingle: makeMaybeSingle(mockOrdersSingleResult),
      };
    }),
    update: jest.fn(() => {
      const inFn = jest.fn(() => ({ error: mockOrderUpdateError }));
      const eq: jest.Mock = jest.fn(() => ({
        eq,
        in: inFn,
        error: mockOrderUpdateError,
      }));
      return { eq };
    }),
  };
}

function createPaymentsMock() {
  return {
    select: jest.fn(() => {
      const limit = jest.fn(() => ({
        maybeSingle: jest.fn(() => mockPaymentResult),
      }));
      const order = jest.fn(() => ({ limit }));
      const eq: jest.Mock = jest.fn(() => ({
        eq,
        maybeSingle: jest.fn(() => mockPaymentResult),
        order,
      }));
      return { eq };
    }),
    update: jest.fn(() => {
      const eq: jest.Mock = jest.fn(() => ({
        eq,
        error: mockPaymentUpdateError,
      }));
      return { eq };
    }),
  };
}

function createSalesMock() {
  return {
    select: jest.fn(() => {
      const is = jest.fn(() => ({
        limit: jest.fn(() => ({
          maybeSingle: jest.fn(() => mockSaleResult),
        })),
      }));
      const eq: jest.Mock = jest.fn(() => ({ eq, is }));
      return { eq };
    }),
    update: jest.fn(() => {
      const eq: jest.Mock = jest.fn(() => ({ eq }));
      return { eq };
    }),
  };
}

function createDefaultMock() {
  const eq: jest.Mock = jest.fn(() => ({
    eq,
    maybeSingle: jest.fn(() => ({ data: null, error: null })),
  }));
  return {
    select: jest.fn(() => ({ eq })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({ data: { id: 'log-1' }, error: null })),
      })),
      error: null,
    })),
  };
}

// --- Import SUT ---

let lookupOrders: typeof import('@/app/actions/order-lookup').lookupOrders;
let lookupOrderDetail: typeof import('@/app/actions/order-lookup').lookupOrderDetail;
let updateBuyerShipping: typeof import('@/app/actions/order-lookup').updateBuyerShipping;
let cancelBuyerOrder: typeof import('@/app/actions/order-lookup').cancelBuyerOrder;

beforeEach(async () => {
  jest.resetModules();
  mockHeadersGet.mockReturnValue('127.0.0.1');
  mockRateLimitResult = { success: true, remaining: 9 };
  mockOrdersSelectResult = { data: null, error: null };
  mockOrdersSingleResult = { data: null, error: null };
  mockPhoneVerifiedResult = { data: null, error: null };
  mockPaymentResult = { data: null, error: null };
  mockSaleResult = { data: null, error: null };
  mockOrderUpdateError = null;
  mockPaymentUpdateError = null;
  mockCancelResult = { success: true };
  ordersSelectCallCount = 0;

  const mod = await import('@/app/actions/order-lookup');
  lookupOrders = mod.lookupOrders;
  lookupOrderDetail = mod.lookupOrderDetail;
  updateBuyerShipping = mod.updateBuyerShipping;
  cancelBuyerOrder = mod.cancelBuyerOrder;
});

// ========== lookupOrders ==========

describe('lookupOrders', () => {
  it('rate limit 초과 시 RATE_LIMITED 반환', async () => {
    mockRateLimitResult = { success: false, remaining: 0 };
    const result = await lookupOrders('홍길동', 'test@test.com', '01012345678');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('RATE_LIMITED');
  });

  it('필수 필드 누락 시 REQUIRED 반환', async () => {
    const result = await lookupOrders('', 'test@test.com', '01012345678');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('REQUIRED');
  });

  it('빈 이메일 시 REQUIRED 반환', async () => {
    const result = await lookupOrders('홍길동', '', '01012345678');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('REQUIRED');
  });

  it('빈 전화번호 시 REQUIRED 반환', async () => {
    const result = await lookupOrders('홍길동', 'test@test.com', '');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('REQUIRED');
  });

  it('DB 에러 시 NOT_FOUND 반환', async () => {
    mockOrdersSelectResult = { data: null, error: { message: 'db error' } };
    const result = await lookupOrders('홍길동', 'test@test.com', '01012345678');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('NOT_FOUND');
  });

  it('전화번호 불일치 시 NOT_FOUND 반환', async () => {
    mockOrdersSelectResult = {
      data: [
        {
          order_no: 'SAF-001',
          status: 'paid',
          total_amount: 5000000,
          created_at: '2026-04-01',
          artworks: { title: '봄', images: ['img.jpg'] },
        },
      ],
      error: null,
    };
    // 전화번호 검증 쿼리 — 다른 번호 반환
    mockPhoneVerifiedResult = {
      data: [{ order_no: 'SAF-001', buyer_phone: '01099999999' }],
      error: null,
    };
    const result = await lookupOrders('홍길동', 'test@test.com', '01012345678');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('NOT_FOUND');
  });

  it('전화번호 일치 시 주문 목록 반환', async () => {
    mockOrdersSelectResult = {
      data: [
        {
          order_no: 'SAF-001',
          status: 'paid',
          total_amount: 5000000,
          created_at: '2026-04-01',
          artworks: { title: '봄의 정원', images: ['spring.jpg'] },
        },
      ],
      error: null,
    };
    mockPhoneVerifiedResult = {
      data: [{ order_no: 'SAF-001', buyer_phone: '01012345678' }],
      error: null,
    };

    const result = await lookupOrders('홍길동', 'test@test.com', '01012345678');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderNo).toBe('SAF-001');
      expect(result.orders[0].artworkTitle).toBe('봄의 정원');
      expect(result.orders[0].artworkImage).toBe('spring.jpg');
    }
  });

  it('+82 국제번호 정규화 처리', async () => {
    mockOrdersSelectResult = {
      data: [
        {
          order_no: 'SAF-002',
          status: 'paid',
          total_amount: 100000,
          created_at: '2026-04-02',
          artworks: { title: '작품', images: [] },
        },
      ],
      error: null,
    };
    mockPhoneVerifiedResult = {
      data: [{ order_no: 'SAF-002', buyer_phone: '+821012345678' }],
      error: null,
    };

    const result = await lookupOrders('홍길동', 'test@test.com', '010-1234-5678');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.orders).toHaveLength(1);
    }
  });
});

// ========== lookupOrderDetail ==========

describe('lookupOrderDetail', () => {
  it('rate limit 초과 시 RATE_LIMITED 반환', async () => {
    mockRateLimitResult = { success: false, remaining: 0 };
    const result = await lookupOrderDetail('SAF-001', 'test@test.com');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('RATE_LIMITED');
  });

  it('필수 필드 누락 시 REQUIRED 반환', async () => {
    const result = await lookupOrderDetail('', 'test@test.com');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('REQUIRED');
  });

  it('주문 없으면 NOT_FOUND 반환', async () => {
    mockOrdersSingleResult = { data: null, error: { message: 'not found' } };
    const result = await lookupOrderDetail('SAF-999', 'test@test.com');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('NOT_FOUND');
  });

  it('이메일 불일치 시 NOT_FOUND 반환', async () => {
    mockOrdersSingleResult = {
      data: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'paid',
        buyer_email: 'other@test.com',
        item_amount: 5000000,
        shipping_amount: 0,
        total_amount: 5000000,
        paid_at: null,
        created_at: '2026-04-01',
        shipping_name: '홍길동',
        shipping_phone: '01012345678',
        shipping_address: '서울',
        shipping_address_detail: null,
        shipping_memo: null,
        shipping_carrier: null,
        tracking_number: null,
        artworks: { title: '봄', images: [], artists: { name_ko: '김작가' } },
      },
      error: null,
    };
    const result = await lookupOrderDetail('SAF-001', 'buyer@test.com');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('NOT_FOUND');
  });

  it('성공 시 주문 상세 반환', async () => {
    mockOrdersSingleResult = {
      data: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'paid',
        buyer_email: 'buyer@test.com',
        item_amount: 5000000,
        shipping_amount: 0,
        total_amount: 5000000,
        paid_at: '2026-04-01T12:00:00Z',
        created_at: '2026-04-01T11:00:00Z',
        shipping_name: '홍길동',
        shipping_phone: '01012345678',
        shipping_address: '서울시 강남구',
        shipping_address_detail: '101호',
        shipping_memo: null,
        shipping_carrier: null,
        tracking_number: null,
        artworks: { title: '봄의 정원', images: ['spring.jpg'], artists: { name_ko: '김작가' } },
      },
      error: null,
    };
    mockPaymentResult = { data: { method: '카드', confirm_response: null }, error: null };

    const result = await lookupOrderDetail('SAF-001', 'buyer@test.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.order.orderNo).toBe('SAF-001');
      expect(result.order.artworkTitle).toBe('봄의 정원');
      expect(result.order.artistName).toBe('김작가');
      expect(result.order.totalAmount).toBe(5000000);
      expect(result.order.paymentMethod).toBe('카드');
      expect(result.order.artworkImage).toBe('spring.jpg');
    }
  });
});

// ========== updateBuyerShipping ==========

describe('updateBuyerShipping', () => {
  it('rate limit 초과 시 RATE_LIMITED 반환', async () => {
    mockRateLimitResult = { success: false, remaining: 0 };
    const result = await updateBuyerShipping('SAF-001', 'test@test.com', {
      shippingName: '홍길동',
      shippingPhone: '01012345678',
      shippingAddress: '서울',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('RATE_LIMITED');
  });

  it('필수 필드 누락 시 REQUIRED 반환', async () => {
    const result = await updateBuyerShipping('', 'test@test.com', {
      shippingName: '홍길동',
      shippingPhone: '01012345678',
      shippingAddress: '서울',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('REQUIRED');
  });

  it('주문 없으면 NOT_FOUND 반환', async () => {
    mockOrdersSingleResult = { data: null, error: { message: 'not found' } };
    const result = await updateBuyerShipping('SAF-999', 'test@test.com', {
      shippingName: '홍길동',
      shippingPhone: '01012345678',
      shippingAddress: '서울',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('NOT_FOUND');
  });

  it('이메일 불일치 시 NOT_FOUND 반환', async () => {
    mockOrdersSingleResult = {
      data: { id: 'ord-1', status: 'paid', buyer_email: 'other@test.com' },
      error: null,
    };
    const result = await updateBuyerShipping('SAF-001', 'buyer@test.com', {
      shippingName: '홍길동',
      shippingPhone: '01012345678',
      shippingAddress: '서울',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('NOT_FOUND');
  });

  it('유효하지 않은 주문 상태일 때 INVALID_STATUS 반환', async () => {
    mockOrdersSingleResult = {
      data: { id: 'ord-1', status: 'shipped', buyer_email: 'buyer@test.com' },
      error: null,
    };
    const result = await updateBuyerShipping('SAF-001', 'buyer@test.com', {
      shippingName: '홍길동',
      shippingPhone: '01012345678',
      shippingAddress: '서울',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('INVALID_STATUS');
  });

  it('paid 상태에서 배송지 수정 성공', async () => {
    mockOrdersSingleResult = {
      data: { id: 'ord-1', status: 'paid', buyer_email: 'buyer@test.com' },
      error: null,
    };
    const result = await updateBuyerShipping('SAF-001', 'buyer@test.com', {
      shippingName: '홍길동',
      shippingPhone: '01012345678',
      shippingAddress: '서울시 강남구',
      shippingAddressDetail: '201호',
      shippingMemo: '경비실',
    });
    expect(result.success).toBe(true);
  });
});

// ========== cancelBuyerOrder ==========

describe('cancelBuyerOrder', () => {
  it('rate limit 초과 시 RATE_LIMITED 반환', async () => {
    mockRateLimitResult = { success: false, remaining: 0 };
    const result = await cancelBuyerOrder('SAF-001', 'test@test.com', '단순변심');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('RATE_LIMITED');
  });

  it('필수 필드 누락 시 REQUIRED 반환', async () => {
    const result = await cancelBuyerOrder('SAF-001', 'test@test.com', '');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('REQUIRED');
  });

  it('주문 없으면 NOT_FOUND 반환', async () => {
    mockOrdersSingleResult = { data: null, error: { message: 'not found' } };
    const result = await cancelBuyerOrder('SAF-999', 'test@test.com', '단순변심');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('NOT_FOUND');
  });

  it('이메일 불일치 시 NOT_FOUND 반환', async () => {
    mockOrdersSingleResult = {
      data: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'paid',
        total_amount: 5000000,
        artwork_id: 'art-1',
        buyer_email: 'other@test.com',
        buyer_name: '홍길동',
      },
      error: null,
    };
    const result = await cancelBuyerOrder('SAF-001', 'buyer@test.com', '단순변심');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('NOT_FOUND');
  });

  it('paid 아닌 상태에서 INVALID_STATUS 반환', async () => {
    mockOrdersSingleResult = {
      data: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'preparing',
        total_amount: 5000000,
        artwork_id: 'art-1',
        buyer_email: 'buyer@test.com',
        buyer_name: '홍길동',
      },
      error: null,
    };
    const result = await cancelBuyerOrder('SAF-001', 'buyer@test.com', '단순변심');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('INVALID_STATUS');
  });

  it('결제 정보 없으면 NO_PAYMENT 반환', async () => {
    mockOrdersSingleResult = {
      data: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'paid',
        total_amount: 5000000,
        artwork_id: 'art-1',
        buyer_email: 'buyer@test.com',
        buyer_name: '홍길동',
      },
      error: null,
    };
    mockPaymentResult = { data: null, error: null };
    const result = await cancelBuyerOrder('SAF-001', 'buyer@test.com', '단순변심');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('NO_PAYMENT');
  });

  it('Toss 결제 취소 실패 시 TOSS_CANCEL_FAILED 반환', async () => {
    mockOrdersSingleResult = {
      data: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'paid',
        total_amount: 5000000,
        artwork_id: 'art-1',
        buyer_email: 'buyer@test.com',
        buyer_name: '홍길동',
      },
      error: null,
    };
    mockPaymentResult = {
      data: { id: 'pay-1', payment_key: 'pk_test', method: '카드' },
      error: null,
    };
    mockCancelResult = { success: false, error: { message: 'cancel failed' } };
    const result = await cancelBuyerOrder('SAF-001', 'buyer@test.com', '단순변심');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('TOSS_CANCEL_FAILED');
  });

  it('결제 취소 성공', async () => {
    mockOrdersSingleResult = {
      data: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'paid',
        total_amount: 5000000,
        artwork_id: 'art-1',
        buyer_email: 'buyer@test.com',
        buyer_name: '홍길동',
      },
      error: null,
    };
    mockPaymentResult = {
      data: { id: 'pay-1', payment_key: 'pk_test', method: '카드' },
      error: null,
    };
    mockSaleResult = { data: { id: 'sale-1' }, error: null };
    mockCancelResult = { success: true };

    const result = await cancelBuyerOrder('SAF-001', 'buyer@test.com', '단순변심');
    expect(result.success).toBe(true);
  });
});
