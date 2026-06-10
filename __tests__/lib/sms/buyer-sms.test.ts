/** @jest-environment node */
import { buildSmsText, sendBuyerSms } from '@/lib/sms/buyer-sms';

import { sendSolapiSms } from '@/lib/sms/solapi';
import { createSupabaseAdminClient } from '@/lib/auth/server';

jest.mock('@/lib/sms/solapi', () => ({ sendSolapiSms: jest.fn() }));
jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));

const mockSend = sendSolapiSms as jest.MockedFunction<typeof sendSolapiSms>;
const mockAdmin = createSupabaseAdminClient as jest.MockedFunction<
  typeof createSupabaseAdminClient
>;

function fakeAdminClient() {
  const insert = jest.fn().mockResolvedValue({ error: null });
  return { client: { from: () => ({ insert }) }, insert };
}

describe('buildSmsText', () => {
  it('payment_confirmed: 이름·작품명·금액 포함', () => {
    const t = buildSmsText('payment_confirmed', {
      buyerName: '홍길동',
      artworkTitle: '들꽃',
      amount: 1500000,
    });
    expect(t).toBe("[씨앗페] 홍길동님, '들꽃' 결제(₩1,500,000)가 완료되었습니다. 감사합니다.");
  });

  it('virtual_account_issued: 은행·계좌·금액·기한', () => {
    const t = buildSmsText('virtual_account_issued', {
      buyerName: '',
      artworkTitle: '',
      amount: 50000,
      virtualAccount: { bankName: 'IBK기업', accountNumber: '01012345678', dueDate: '6/5 23:59' },
    });
    expect(t).toBe('[씨앗페] 입금안내: IBK기업 01012345678 / ₩50,000 / 기한 6/5 23:59');
  });

  it('virtual_account_issued: 이름이 있으면 인사말 포함', () => {
    const t = buildSmsText('virtual_account_issued', {
      buyerName: '홍길동',
      artworkTitle: '',
      amount: 50000,
      virtualAccount: { bankName: 'IBK기업', accountNumber: '01012345678', dueDate: '6/5 23:59' },
    });
    expect(t).toBe('[씨앗페] 홍길동님, 입금안내: IBK기업 01012345678 / ₩50,000 / 기한 6/5 23:59');
  });

  it('shipped: 작품명·택배사·운송장', () => {
    const t = buildSmsText('shipped', {
      buyerName: '',
      artworkTitle: '들꽃',
      amount: 0,
      carrier: 'CJ대한통운',
      trackingNumber: '123456789',
    });
    expect(t).toBe("[씨앗페] '들꽃' 발송완료. CJ대한통운 123456789");
  });

  it('refunded·delivered·deposit_confirmed·auto_cancelled 본문', () => {
    expect(buildSmsText('refunded', { buyerName: '', artworkTitle: '', amount: 50000 })).toBe(
      '[씨앗페] ₩50,000 환불이 처리되었습니다.'
    );
    expect(buildSmsText('delivered', { buyerName: '', artworkTitle: '들꽃', amount: 0 })).toBe(
      "[씨앗페] '들꽃' 배송이 완료되었습니다."
    );
    expect(
      buildSmsText('deposit_confirmed', { buyerName: '김작가', artworkTitle: '', amount: 0 })
    ).toBe('[씨앗페] 김작가님, 입금이 확인되었습니다. 작품을 준비합니다.');
    expect(buildSmsText('auto_cancelled', { buyerName: '', artworkTitle: '', amount: 0 })).toBe(
      '[씨앗페] 주문이 자동취소되었습니다.'
    );
  });

  it('en payment_confirmed: 영문 본문 + [Seed Art Festival] 접두어', () => {
    const t = buildSmsText(
      'payment_confirmed',
      { buyerName: 'Jane', artworkTitle: 'Wildflowers', amount: 1500000 },
      'en'
    );
    expect(t).toBe(
      "[Seed Art Festival] Jane, your payment (₩1,500,000) for 'Wildflowers' is complete. Thank you."
    );
  });

  it('en virtual_account_issued: 은행·계좌·금액·기한 (이름 없음)', () => {
    const t = buildSmsText(
      'virtual_account_issued',
      {
        buyerName: '',
        artworkTitle: '',
        amount: 50000,
        virtualAccount: { bankName: 'IBK', accountNumber: '01012345678', dueDate: '6/5 23:59' },
      },
      'en'
    );
    expect(t).toBe('[Seed Art Festival] Deposit: IBK 01012345678 / ₩50,000 (due 6/5 23:59)');
  });

  it('en virtual_account_issued: 이름이 있으면 인사말 포함', () => {
    const t = buildSmsText(
      'virtual_account_issued',
      {
        buyerName: 'Jane',
        artworkTitle: '',
        amount: 50000,
        virtualAccount: { bankName: 'IBK', accountNumber: '01012345678', dueDate: '6/5 23:59' },
      },
      'en'
    );
    expect(t).toBe('[Seed Art Festival] Jane, Deposit: IBK 01012345678 / ₩50,000 (due 6/5 23:59)');
  });

  it('en deposit_confirmed', () => {
    expect(
      buildSmsText('deposit_confirmed', { buyerName: 'Jane', artworkTitle: '', amount: 0 }, 'en')
    ).toBe("[Seed Art Festival] Jane, your deposit is confirmed. We're preparing your artwork.");
  });

  it('en shipped: 작품명·택배사·운송장', () => {
    const t = buildSmsText(
      'shipped',
      {
        buyerName: '',
        artworkTitle: 'Wildflowers',
        amount: 0,
        carrier: 'CJ Logistics',
        trackingNumber: '123456789',
      },
      'en'
    );
    expect(t).toBe("[Seed Art Festival] 'Wildflowers' has shipped. CJ Logistics 123456789");
  });

  it('en delivered·refunded·auto_cancelled 본문', () => {
    expect(
      buildSmsText('delivered', { buyerName: '', artworkTitle: 'Wildflowers', amount: 0 }, 'en')
    ).toBe("[Seed Art Festival] 'Wildflowers' has been delivered.");
    expect(buildSmsText('refunded', { buyerName: '', artworkTitle: '', amount: 50000 }, 'en')).toBe(
      '[Seed Art Festival] Your refund of ₩50,000 has been processed.'
    );
    expect(
      buildSmsText('auto_cancelled', { buyerName: '', artworkTitle: '', amount: 0 }, 'en')
    ).toBe('[Seed Art Festival] Your order has been automatically cancelled.');
  });
});

describe('sendBuyerSms', () => {
  beforeEach(() => jest.clearAllMocks());

  it('en locale은 스킵 (발송·로그 없음)', async () => {
    await sendBuyerSms(
      '01012345678',
      'payment_confirmed',
      { buyerName: 'A', artworkTitle: 'B', amount: 1 },
      'en'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('비-KR 번호는 스킵', async () => {
    await sendBuyerSms('02-123-4567', 'payment_confirmed', {
      buyerName: 'A',
      artworkTitle: 'B',
      amount: 1,
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('정상 발송 시 정규화된 번호로 호출하고 sms_logs에 sent 기록', async () => {
    const { client, insert } = fakeAdminClient();
    mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockSend.mockResolvedValue({ ok: true, messageId: 'M1', segment: 'SMS' });

    await sendBuyerSms(
      '010-1234-5678',
      'payment_confirmed',
      { buyerName: 'A', artworkTitle: 'B', amount: 1 },
      'ko',
      'SAF-1'
    );

    expect(mockSend).toHaveBeenCalledWith({
      to: '01012345678',
      text: expect.stringContaining('[씨앗페]'),
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_no: 'SAF-1',
        to_phone: '01012345678',
        type: 'payment_confirmed',
        status: 'sent',
        provider_message_id: 'M1',
        segment: 'SMS',
      })
    );
  });

  it('발송 실패해도 throw하지 않고 failed 로그', async () => {
    const { client, insert } = fakeAdminClient();
    mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockSend.mockResolvedValue({ ok: false, error: 'http_400' });

    await expect(
      sendBuyerSms('01012345678', 'refunded', { buyerName: '', artworkTitle: '', amount: 1 })
    ).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'http_400' })
    );
  });
});
