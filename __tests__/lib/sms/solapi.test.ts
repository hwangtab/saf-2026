/** @jest-environment node */
import { sendSolapiSms, sendSolapiAlimTalk } from '@/lib/sms/solapi';

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

describe('sendSolapiAlimTalk', () => {
  beforeEach(() => {
    process.env.SOLAPI_API_KEY = 'key';
    process.env.SOLAPI_API_SECRET = 'secret';
    process.env.SOLAPI_SENDER = '0287654321';
    process.env.SOLAPI_KAKAO_PF_ID = 'PF001';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it('kakaoOptions(pfId·templateId·disableSms·#{} variables)를 포함한 body를 전송한다', async () => {
    const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'K1', type: 'ATA' });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const r = await sendSolapiAlimTalk({
      to: '01012345678',
      text: '[씨앗페] 홍길동님 결제 완료',
      templateId: 'TMPL_PAY',
      variables: { '#{name}': '홍길동' },
    });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.solapi.com/messages/v4/send');
    expect((init.headers as Record<string, string>).Authorization).toMatch(
      /^HMAC-SHA256 apiKey=key, date=.+, salt=.+, signature=[a-f0-9]+$/
    );
    expect(JSON.parse(init.body as string)).toEqual({
      message: {
        to: '01012345678',
        from: '0287654321',
        text: '[씨앗페] 홍길동님 결제 완료',
        kakaoOptions: {
          pfId: 'PF001',
          templateId: 'TMPL_PAY',
          disableSms: false,
          variables: { '#{name}': '홍길동' },
        },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.messageId).toBe('K1');
    expect(r.segment).toBe('ATA');
  });

  it('buttons가 주어지면 kakaoOptions.buttons에 포함한다', async () => {
    const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'K2', type: 'ATA' });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await sendSolapiAlimTalk({
      to: '01012345678',
      text: 'fallback',
      templateId: 'TMPL_SHIP',
      buttons: [
        { buttonName: '배송조회', buttonType: 'WL', linkMo: 'https://m', linkPc: 'https://p' },
      ],
    });
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.message.kakaoOptions.buttons).toEqual([
      { buttonName: '배송조회', buttonType: 'WL', linkMo: 'https://m', linkPc: 'https://p' },
    ]);
  });

  it('SOLAPI_KAKAO_PF_ID 미설정 시 sendSolapiSms로 degrade (kakaoOptions 없음)', async () => {
    delete process.env.SOLAPI_KAKAO_PF_ID;
    const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'M9', type: 'SMS' });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const r = await sendSolapiAlimTalk({
      to: '01012345678',
      text: 'fallback text',
      templateId: 'TMPL_PAY',
    });
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body).toEqual({
      message: { to: '01012345678', from: '0287654321', text: 'fallback text' },
    });
    expect(r.ok).toBe(true);
    expect(r.segment).toBe('SMS');
  });

  it('templateId가 빈 문자열이면 sendSolapiSms로 degrade', async () => {
    const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'M10', type: 'SMS' });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const r = await sendSolapiAlimTalk({ to: '01012345678', text: 'fb', templateId: '' });
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.message.kakaoOptions).toBeUndefined();
    expect(r.ok).toBe(true);
  });

  it('core Solapi env 미설정 시 no-op (fetch 미호출, not-configured)', async () => {
    delete process.env.SOLAPI_API_KEY;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const r = await sendSolapiAlimTalk({ to: '01012345678', text: 'hi', templateId: 'TMPL_PAY' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: false, error: 'not-configured' });
  });

  it('5xx는 1회 재시도 후 실패 반환 (alimtalk 경로)', async () => {
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const r = await sendSolapiAlimTalk({ to: '01012345678', text: 'hi', templateId: 'TMPL_PAY' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(r.ok).toBe(false);
  });
});
