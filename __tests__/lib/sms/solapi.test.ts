/** @jest-environment node */
import { sendSolapiSms } from '@/lib/sms/solapi';

const ORIGINAL_ENV = { ...process.env };

function mockFetchOnce(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

describe('sendSolapiSms', () => {
  beforeEach(() => {
    process.env.SOLAPI_API_KEY = 'key';
    process.env.SOLAPI_API_SECRET = 'secret';
    process.env.SOLAPI_SENDER = '0287654321';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it('env 미설정 시 no-op (fetch 미호출, not-configured)', async () => {
    delete process.env.SOLAPI_API_KEY;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const r = await sendSolapiSms({ to: '01012345678', text: 'hi' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: false, error: 'not-configured' });
  });

  it('성공 응답에서 messageId·segment를 파싱한다', async () => {
    global.fetch = mockFetchOnce(200, {
      statusCode: '2000',
      messageId: 'M123',
      type: 'LMS',
    }) as unknown as typeof fetch;
    const r = await sendSolapiSms({ to: '01012345678', text: 'hi' });
    expect(r.ok).toBe(true);
    expect(r.messageId).toBe('M123');
    expect(r.segment).toBe('LMS');
  });

  it('HMAC-SHA256 Authorization 헤더와 message body를 전송한다', async () => {
    const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'M1', type: 'SMS' });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await sendSolapiSms({ to: '01012345678', text: 'hello' });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.solapi.com/messages/v4/send');
    expect((init.headers as Record<string, string>).Authorization).toMatch(
      /^HMAC-SHA256 apiKey=key, date=.+, salt=.+, signature=[a-f0-9]+$/
    );
    expect(JSON.parse(init.body as string)).toEqual({
      message: { to: '01012345678', from: '0287654321', text: 'hello' },
    });
  });

  it('5xx는 1회 재시도 후 실패 반환', async () => {
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const r = await sendSolapiSms({ to: '01012345678', text: 'hi' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(r.ok).toBe(false);
  });
});
