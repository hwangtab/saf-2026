import {
  getSmsLogs,
  resendSms,
  addSmsSuppression,
  removeSmsSuppression,
  isSmsSuppressed,
  getSmsSuppressionCount,
} from '@/app/actions/admin-sms';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';
import { hashPhone } from '@/lib/sms/phone-hash';

const mockFrom = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({ from: mockFrom })),
}));
jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: jest.fn(async () => {}),
}));

const mockSendBuyerSms = jest.fn(async () => ({ ok: true, skipped: false }));
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
        return createSupabaseQueryMock({ data: logRow, error: null }) as never;
      if (table === 'orders')
        return createSupabaseQueryMock({ data: orderRow, error: null }) as never;
      return createSupabaseQueryMock({ data: null, error: null }) as never;
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
    mockFrom.mockImplementation(
      () => createSupabaseQueryMock({ data: null, error: null }) as never
    );
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
        return createSupabaseQueryMock({ data: logRow, error: null }) as never;
      return createSupabaseQueryMock({ data: null, error: null }) as never;
    });
    const result = await resendSms('log-x');
    expect(result.ok).toBe(false);
    expect(mockSendBuyerSms).not.toHaveBeenCalled();
  });

  it('virtual_account_issued 실패 로그는 metadata 계좌정보로 재발송 가능', async () => {
    const logRow = {
      id: 'log-va',
      order_no: 'SAF-VA',
      to_phone: '01012345678',
      type: 'virtual_account_issued',
      status: 'failed',
    };
    const orderRow = {
      order_no: 'SAF-VA',
      buyer_name: '홍길동',
      buyer_phone: '01012345678',
      total_amount: 50000,
      shipping_carrier: null,
      tracking_number: null,
      created_at: '2026-06-19T05:00:00.000Z',
      metadata: {
        locale: 'ko',
        bank_transfer: {
          bankName: '기업은행 (IBK)',
          accountNumber: '301-101031-04-095',
          holderName: '한국스마트협동조합',
          dueDate: '2026. 6. 20. 오후 2:00:00',
        },
      },
      artworks: { title: '들꽃', artists: { name_ko: '김작가' } },
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sms_logs')
        return createSupabaseQueryMock({ data: logRow, error: null }) as never;
      if (table === 'orders')
        return createSupabaseQueryMock({ data: orderRow, error: null }) as never;
      return createSupabaseQueryMock({ data: null, error: null }) as never;
    });
    const result = await resendSms('log-va');
    expect(result.ok).toBe(true);
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '01012345678',
      'virtual_account_issued',
      expect.objectContaining({
        buyerName: '홍길동',
        artistName: '김작가',
        artworkTitle: '들꽃',
        amount: 50000,
        virtualAccount: {
          bankName: '기업은행 (IBK)',
          accountNumber: '301-101031-04-095',
          holderName: '한국스마트협동조합',
          dueDate: '2026. 6. 20. 오후 2:00:00',
        },
      }),
      'ko',
      'SAF-VA'
    );
  });

  it('virtual_account_issued legacy 주문은 created_at + 24시간 fallback으로 재발송', async () => {
    const logRow = {
      id: 'log-va-legacy',
      order_no: 'SAF-VA-LEGACY',
      to_phone: '01012345678',
      type: 'virtual_account_issued',
      status: 'failed',
    };
    const orderRow = {
      order_no: 'SAF-VA-LEGACY',
      buyer_name: '홍길동',
      buyer_phone: '01012345678',
      total_amount: 50000,
      shipping_carrier: null,
      tracking_number: null,
      created_at: '2026-06-19T05:00:00.000Z',
      metadata: { locale: 'ko' },
      artworks: { title: '들꽃', artists: { name_ko: '김작가' } },
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sms_logs')
        return createSupabaseQueryMock({ data: logRow, error: null }) as never;
      if (table === 'orders')
        return createSupabaseQueryMock({ data: orderRow, error: null }) as never;
      return createSupabaseQueryMock({ data: null, error: null }) as never;
    });
    const result = await resendSms('log-va-legacy');
    expect(result.ok).toBe(true);
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '01012345678',
      'virtual_account_issued',
      expect.objectContaining({
        virtualAccount: expect.objectContaining({
          bankName: '기업은행 (IBK)',
          accountNumber: '301-101031-04-095',
          holderName: '한국스마트협동조합',
          dueDate: expect.any(String),
        }),
      }),
      'ko',
      'SAF-VA-LEGACY'
    );
  });

  it('이미 발송된(sent) 건은 재발송 불가 ok:false', async () => {
    const logRow = {
      id: 'log-s',
      order_no: 'SAF-S',
      to_phone: '01012345678',
      type: 'shipped',
      status: 'sent',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sms_logs')
        return createSupabaseQueryMock({ data: logRow, error: null }) as never;
      return createSupabaseQueryMock({ data: null, error: null }) as never;
    });
    const result = await resendSms('log-s');
    expect(result.ok).toBe(false);
    expect(mockSendBuyerSms).not.toHaveBeenCalled();
  });

  it('sendBuyerSms 실패 시 ok:false 반환 및 활동 로그 미기록', async () => {
    const { logAdminAction } = jest.requireMock('@/app/actions/activity-log-writer') as {
      logAdminAction: jest.Mock;
    };
    const logRow = {
      id: 'log-f',
      order_no: 'SAF-F',
      to_phone: '01012345678',
      type: 'shipped',
      status: 'failed',
    };
    const orderRow = {
      order_no: 'SAF-F',
      buyer_name: 'Jane',
      buyer_phone: '01012345678',
      total_amount: 1000000,
      shipping_carrier: null,
      tracking_number: null,
      metadata: { locale: 'ko' },
      artworks: { title: 'Test' },
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sms_logs')
        return createSupabaseQueryMock({ data: logRow, error: null }) as never;
      if (table === 'orders')
        return createSupabaseQueryMock({ data: orderRow, error: null }) as never;
      return createSupabaseQueryMock({ data: null, error: null }) as never;
    });
    mockSendBuyerSms.mockResolvedValueOnce({ ok: false, skipped: false, error: 'send_failed' });

    const result = await resendSms('log-f');
    expect(result.ok).toBe(false);
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});

describe('addSmsSuppression', () => {
  beforeEach(() => jest.clearAllMocks());

  it('010 번호를 정규화하여 hashPhone 해시로 upsert한다', async () => {
    const query = createSupabaseQueryMock({ data: null, error: null });
    mockFrom.mockReturnValue(query);

    const result = await addSmsSuppression('010-1234-5678');

    expect(result.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('sms_suppressions');
    const q = query as unknown as Record<string, jest.Mock>;
    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        phone_hash: hashPhone('01012345678'),
        channel: 'all',
        reason: 'manual',
      }),
      expect.objectContaining({ onConflict: 'phone_hash,channel', ignoreDuplicates: true })
    );
  });

  it('channel 파라미터를 전달하면 해당 채널로 upsert한다', async () => {
    const query = createSupabaseQueryMock({ data: null, error: null });
    mockFrom.mockReturnValue(query);

    const result = await addSmsSuppression('01099998888', 'customer');

    expect(result.ok).toBe(true);
    const q = query as unknown as Record<string, jest.Mock>;
    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        phone_hash: hashPhone('01099998888'),
        channel: 'customer',
        reason: 'manual',
      }),
      expect.anything()
    );
  });

  it('비-010 번호는 ok:false를 반환하고 DB를 건드리지 않는다', async () => {
    const result = await addSmsSuppression('02-1234-5678');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/010/);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('DB 오류 시 ok:false를 반환한다', async () => {
    const query = createSupabaseQueryMock({ data: null, error: { message: 'db error' } });
    mockFrom.mockReturnValue(query);

    const result = await addSmsSuppression('01012345678');

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('removeSmsSuppression', () => {
  beforeEach(() => jest.clearAllMocks());

  it('channel 미지정 시 phone_hash 일치 행 전체 삭제', async () => {
    const query = createSupabaseQueryMock({ data: null, error: null });
    mockFrom.mockReturnValue(query);

    const result = await removeSmsSuppression('01012345678');

    expect(result.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('sms_suppressions');
    const q = query as unknown as Record<string, jest.Mock>;
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith('phone_hash', hashPhone('01012345678'));
    // channel eq는 호출되지 않아야 함
    const eqCalls = (q.eq as jest.Mock).mock.calls;
    expect(eqCalls.every((c: string[]) => c[0] !== 'channel')).toBe(true);
  });

  it('channel 지정 시 해당 채널 행만 삭제한다', async () => {
    const query = createSupabaseQueryMock({ data: null, error: null });
    mockFrom.mockReturnValue(query);

    const result = await removeSmsSuppression('01012345678', 'customer');

    expect(result.ok).toBe(true);
    const q = query as unknown as Record<string, jest.Mock>;
    expect(q.eq).toHaveBeenCalledWith('channel', 'customer');
  });

  it('비-010 번호는 ok:false 반환', async () => {
    const result = await removeSmsSuppression('not-a-phone');
    expect(result.ok).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('isSmsSuppressed', () => {
  beforeEach(() => jest.clearAllMocks());

  it('차단 채널이 있으면 suppressed:true와 채널 목록을 반환한다', async () => {
    const rows = [{ channel: 'customer' }, { channel: 'all' }];
    const query = createSupabaseQueryMock({ data: rows, error: null });
    mockFrom.mockReturnValue(query);

    const result = await isSmsSuppressed('01012345678');

    expect(result.suppressed).toBe(true);
    expect(result.channels).toEqual(['customer', 'all']);
    const q = query as unknown as Record<string, jest.Mock>;
    expect(q.eq).toHaveBeenCalledWith('phone_hash', hashPhone('01012345678'));
  });

  it('차단 행이 없으면 suppressed:false와 빈 배열을 반환한다', async () => {
    const query = createSupabaseQueryMock({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    const result = await isSmsSuppressed('01012345678');

    expect(result.suppressed).toBe(false);
    expect(result.channels).toEqual([]);
  });

  it('비-010 번호는 조회 없이 suppressed:false를 반환한다', async () => {
    const result = await isSmsSuppressed('not-valid');

    expect(result.suppressed).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('getSmsSuppressionCount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('총 행 수를 반환한다', async () => {
    const query = createSupabaseQueryMock({ data: null, error: null, count: 42 } as unknown as {
      data: null;
      error: null;
    });
    mockFrom.mockReturnValue(query);

    const result = await getSmsSuppressionCount();

    expect(result).toBe(42);
    expect(mockFrom).toHaveBeenCalledWith('sms_suppressions');
  });

  it('DB 오류 시 0을 반환한다', async () => {
    const query = createSupabaseQueryMock({
      data: null,
      error: { message: 'error' },
      count: null,
    } as unknown as { data: null; error: { message: string } });
    mockFrom.mockReturnValue(query);

    const result = await getSmsSuppressionCount();

    expect(result).toBe(0);
  });
});
