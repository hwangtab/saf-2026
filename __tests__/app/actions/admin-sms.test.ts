import { getSmsLogs, resendSms } from '@/app/actions/admin-sms';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({ from: mockFrom })),
}));
jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: jest.fn(async () => {}),
}));

const mockSendBuyerSms = jest.fn(async () => {});
jest.mock('@/lib/sms/buyer-sms', () => ({
  sendBuyerSms: (...args: unknown[]) => mockSendBuyerSms(...args),
}));

describe('getSmsLogs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('기본 페이지네이션 반환형 { rows, total, page, pageSize }', async () => {
    const rows = [
      {
        id: 'log-1',
        order_no: 'SAF-1',
        to_phone: '01012345678',
        type: 'payment_confirmed',
        provider: 'solapi',
        provider_message_id: 'M1',
        status: 'sent',
        segment: 'SMS',
        error: null,
        created_at: '2026-06-10T00:00:00.000Z',
      },
    ];
    mockFrom.mockReturnValue(
      createSupabaseQueryMock({ data: rows, error: null, count: 1 } as unknown as {
        data: typeof rows;
        error: null;
      })
    );

    const result = await getSmsLogs({});

    expect(mockFrom).toHaveBeenCalledWith('sms_logs');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe('log-1');
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  it('type/status 필터와 q 검색을 query builder에 적용한다', async () => {
    const query = createSupabaseQueryMock({ data: [], error: null, count: 0 } as unknown as {
      data: never[];
      error: null;
    });
    mockFrom.mockReturnValue(query);

    await getSmsLogs({
      type: 'shipped',
      status: 'failed',
      q: '01099998888',
      page: 2,
      pageSize: 50,
    });

    const q = query as unknown as Record<string, jest.Mock>;
    expect(q.eq).toHaveBeenCalledWith('type', 'shipped');
    expect(q.eq).toHaveBeenCalledWith('status', 'failed');
    expect(q.or).toHaveBeenCalledWith('to_phone.ilike.%01099998888%,order_no.ilike.%01099998888%');
    expect(q.range).toHaveBeenCalledWith(50, 99);
  });

  it('from/to 기간 필터를 created_at에 적용한다', async () => {
    const query = createSupabaseQueryMock({ data: [], error: null, count: 0 } as unknown as {
      data: never[];
      error: null;
    });
    mockFrom.mockReturnValue(query);

    await getSmsLogs({ from: '2026-06-01', to: '2026-06-10' });

    const q = query as unknown as Record<string, jest.Mock>;
    expect(q.gte).toHaveBeenCalledWith('created_at', '2026-06-01T00:00:00.000Z');
    expect(q.lte).toHaveBeenCalledWith('created_at', '2026-06-10T23:59:59.999Z');
  });
});

describe('resendSms', () => {
  beforeEach(() => jest.clearAllMocks());

  it('실패 로그를 order 재조회 후 sendBuyerSms로 재발송하고 활동 로그를 남긴다', async () => {
    const logRow = {
      id: 'log-9',
      order_no: 'SAF-9',
      to_phone: '01012345678',
      type: 'shipped',
      status: 'failed',
    };
    const orderRow = {
      order_no: 'SAF-9',
      buyer_name: 'Jane',
      buyer_phone: '01012345678',
      total_amount: 1500000,
      shipping_carrier: 'CJ Logistics',
      tracking_number: '123456789',
      metadata: { locale: 'en' },
      artworks: { title: 'Wildflowers' },
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'sms_logs')
        return createSupabaseQueryMock({ data: [logRow], error: null }) as never;
      if (table === 'orders')
        return createSupabaseQueryMock({ data: [orderRow], error: null }) as never;
      return createSupabaseQueryMock({ data: [], error: null }) as never;
    });

    const { logAdminAction } = jest.requireMock('@/app/actions/activity-log-writer') as {
      logAdminAction: jest.Mock;
    };

    const result = await resendSms('log-9');

    expect(result.ok).toBe(true);
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '01012345678',
      'shipped',
      expect.objectContaining({
        buyerName: 'Jane',
        artworkTitle: 'Wildflowers',
        amount: 1500000,
        carrier: 'CJ Logistics',
        trackingNumber: '123456789',
      }),
      'en',
      'SAF-9'
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      'sms_resent',
      'sms_log',
      'log-9',
      expect.objectContaining({ order_no: 'SAF-9', type: 'shipped' })
    );
  });

  it('로그를 찾지 못하면 ok:false', async () => {
    mockFrom.mockImplementation(() => createSupabaseQueryMock({ data: [], error: null }) as never);
    const result = await resendSms('missing');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(mockSendBuyerSms).not.toHaveBeenCalled();
  });

  it('order_no가 없는 로그(개별 발송 등)는 재발송 불가 ok:false', async () => {
    const logRow = {
      id: 'log-x',
      order_no: null,
      to_phone: '01012345678',
      type: 'shipped',
      status: 'failed',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sms_logs')
        return createSupabaseQueryMock({ data: [logRow], error: null }) as never;
      return createSupabaseQueryMock({ data: [], error: null }) as never;
    });
    const result = await resendSms('log-x');
    expect(result.ok).toBe(false);
    expect(mockSendBuyerSms).not.toHaveBeenCalled();
  });
});
