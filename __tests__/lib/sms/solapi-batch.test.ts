/** @jest-environment node */
import { sendSolapiBatch } from '@/lib/sms/solapi-batch';
import { sendSolapiSms } from '@/lib/sms/solapi';

jest.mock('@/lib/sms/solapi', () => ({ sendSolapiSms: jest.fn() }));
const mockSend = sendSolapiSms as jest.MockedFunction<typeof sendSolapiSms>;

describe('sendSolapiBatch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('입력 순서대로 per-item 결과를 반환(성공/실패 혼재)', async () => {
    mockSend
      .mockResolvedValueOnce({ ok: true, messageId: 'M1', segment: 'SMS' })
      .mockResolvedValueOnce({ ok: false, error: 'http_400' })
      .mockResolvedValueOnce({ ok: true, messageId: 'M3', segment: 'LMS' });

    const out = await sendSolapiBatch([
      { to: '01011110001', text: 'a' },
      { to: '01011110002', text: 'b' },
      { to: '01011110003', text: 'c' },
    ]);

    expect(out).toEqual([
      { ok: true, messageId: 'M1', segment: 'SMS' },
      { ok: false, error: 'http_400' },
      { ok: true, messageId: 'M3', segment: 'LMS' },
    ]);
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('빈 배열은 빈 결과', async () => {
    expect(await sendSolapiBatch([])).toEqual([]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('개별 발송이 throw해도 전체는 throw하지 않고 error 항목으로 반환', async () => {
    mockSend.mockRejectedValueOnce(new Error('boom'));
    const out = await sendSolapiBatch([{ to: '01011110001', text: 'a' }]);
    expect(out[0].ok).toBe(false);
    expect(out[0].error).toContain('boom');
  });
});
