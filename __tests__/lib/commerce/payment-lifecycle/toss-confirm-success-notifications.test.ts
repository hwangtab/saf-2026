const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockNotifyEmail = jest.fn();
const mockSendBuyerEmail = jest.fn();
const mockSendBuyerSms = jest.fn();
const mockBuildAdminNotificationFields = jest.fn((info: unknown, fields?: unknown) => ({
  ...(info as Record<string, unknown>),
  ...(fields as Record<string, unknown> | undefined),
}));
const mockRunAllSettled = jest.fn(async (_label: string, tasks: Array<() => unknown>) => {
  for (const task of tasks) await task();
});

jest.mock('next/server', () => ({
  after: (callback: () => unknown) => mockAfter(callback),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: (...args: unknown[]) => mockNotifyEmail(...args),
  sendBuyerEmail: (...args: unknown[]) => mockSendBuyerEmail(...args),
}));

jest.mock('@/lib/sms/buyer-sms', () => ({
  sendBuyerSms: (...args: unknown[]) => mockSendBuyerSms(...args),
}));

jest.mock('@/lib/server/after-response', () => ({
  runAllSettled: (...args: unknown[]) => mockRunAllSettled(...args),
}));

jest.mock('@/lib/utils/get-order-notification-info', () => ({
  buildAdminNotificationFields: (...args: unknown[]) => mockBuildAdminNotificationFields(...args),
}));

const order = {
  buyer_email: 'buyer@example.com',
  buyer_name: '구매자',
  buyer_phone: '010-0000-0000',
};

const notifyInfo = {
  orderId: 'order-1',
  orderNo: 'SAF-CONFIRM-001',
  buyerName: '구매자',
  buyerEmail: 'buyer@example.com',
  buyerPhone: '010-0000-0000',
  artworkTitle: '작품',
  artistName: '작가',
  itemAmount: 90000,
  shippingAmount: 10000,
  totalAmount: 100000,
  shippingName: '수령인',
  shippingPhone: '010-1111-1111',
  shippingAddress: '서울',
  shippingMemo: '문 앞',
  locale: 'ko' as const,
};

async function flushAfterCallbacks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('toss confirm success notification helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules payment-confirmed admin, buyer email, and buyer sms notifications with the existing label', async () => {
    const { scheduleTossConfirmPaymentConfirmedNotifications } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-success-notifications'
    );

    scheduleTossConfirmPaymentConfirmedNotifications({
      order,
      orderId: 'SAF-CONFIRM-001',
      amount: 100000,
      buyerLocale: 'ko',
      notifyInfo,
      paymentMethod: '카드',
    });
    await flushAfterCallbacks();

    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'tossConfirm.paymentConfirmed.notifications',
      expect.any(Array)
    );
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'payment',
      '결제 승인 완료',
      expect.objectContaining({ 결제수단: '카드' })
    );
    expect(mockSendBuyerEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      'payment_confirmed',
      expect.objectContaining({
        orderNo: 'SAF-CONFIRM-001',
        buyerName: '구매자',
        amount: 100000,
        paymentMethod: '카드',
      }),
      'ko'
    );
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '010-0000-0000',
      'payment_confirmed',
      expect.objectContaining({ amount: 100000 }),
      'ko',
      'SAF-CONFIRM-001'
    );
  });

  it('schedules virtual-account-issued admin, buyer email, and buyer sms notifications with the existing label', async () => {
    const { scheduleTossConfirmVirtualAccountIssuedNotifications } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-success-notifications'
    );

    scheduleTossConfirmVirtualAccountIssuedNotifications({
      order,
      orderId: 'SAF-VA-001',
      amount: 100000,
      buyerLocale: 'ko',
      notifyInfo,
      virtualAccount: {
        bankName: '국민은행',
        accountNumber: '123-456',
        dueDate: '2026-07-03T12:00:00+09:00',
      },
    });
    await flushAfterCallbacks();

    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'tossConfirm.virtualAccountIssued.notifications',
      expect.any(Array)
    );
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'info',
      '가상계좌 발급 완료 (입금 대기)',
      expect.objectContaining({ 은행: '국민은행', 계좌번호: '123-456' })
    );
    expect(mockSendBuyerEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      'virtual_account_issued',
      expect.objectContaining({
        orderNo: 'SAF-VA-001',
        buyerName: '구매자',
        amount: 100000,
        virtualAccount: expect.objectContaining({ bankName: '국민은행' }),
      }),
      'ko'
    );
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '010-0000-0000',
      'virtual_account_issued',
      expect.objectContaining({
        amount: 100000,
        virtualAccount: expect.objectContaining({ accountNumber: '123-456' }),
      }),
      'ko',
      'SAF-VA-001'
    );
  });

  it('omits buyer email task when the order has no buyer email but keeps sms notification', async () => {
    const { scheduleTossConfirmPaymentConfirmedNotifications } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-success-notifications'
    );

    scheduleTossConfirmPaymentConfirmedNotifications({
      order: { ...order, buyer_email: null },
      orderId: 'SAF-NO-EMAIL-001',
      amount: 100000,
      buyerLocale: 'ko',
      notifyInfo: null,
      paymentMethod: '카드',
    });
    await flushAfterCallbacks();

    expect(mockNotifyEmail).toHaveBeenCalledWith('payment', '결제 승인 완료', {
      주문번호: 'SAF-NO-EMAIL-001',
      결제수단: '카드',
      금액: '₩100,000',
    });
    expect(mockSendBuyerEmail).not.toHaveBeenCalled();
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '010-0000-0000',
      'payment_confirmed',
      expect.objectContaining({ buyerName: '구매자', amount: 100000 }),
      'ko',
      'SAF-NO-EMAIL-001'
    );
  });
});
