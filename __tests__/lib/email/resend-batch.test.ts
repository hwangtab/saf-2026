import { buildBatchIdempotencyKey, sendBatch } from '@/lib/email/resend-batch';

describe('buildBatchIdempotencyKey', () => {
  it('같은 broadcast·같은 수신자 집합이면 순서가 달라도 동일 키(재발송 매칭)', () => {
    const a = buildBatchIdempotencyKey('bc1', ['r1', 'r2', 'r3']);
    const b = buildBatchIdempotencyKey('bc1', ['r3', 'r1', 'r2']);
    expect(a).toBe(b);
  });

  it('수신자 집합이 다르면 키가 다르다(충돌 없음 → 정당한 발송 드롭 안 함)', () => {
    const a = buildBatchIdempotencyKey('bc1', ['r1', 'r2', 'r3']);
    const b = buildBatchIdempotencyKey('bc1', ['r1', 'r2', 'r4']);
    expect(a).not.toBe(b);
  });

  it('broadcast가 다르면 키가 다르다', () => {
    const a = buildBatchIdempotencyKey('bc1', ['r1', 'r2']);
    const b = buildBatchIdempotencyKey('bc2', ['r1', 'r2']);
    expect(a).not.toBe(b);
  });

  it('broadcast id로 prefix되어 식별 가능', () => {
    expect(buildBatchIdempotencyKey('bc-xyz', ['r1'])).toMatch(/^bcast_bc-xyz_[0-9a-f]{40}$/);
  });
});

describe('sendBatch — Idempotency-Key 헤더', () => {
  const origFetch = global.fetch;
  const origKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    global.fetch = origFetch;
    process.env.RESEND_API_KEY = origKey;
  });

  it('idempotencyKey를 주면 Idempotency-Key 헤더로 전달', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: 'm1' }] }),
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await sendBatch([{ from: 'a@x.com', to: 'b@y.com', subject: 's', html: '<p>h</p>' }], {
      idempotencyKey: 'bcast_bc1_abc',
    });

    const headers = (fetchMock as jest.Mock).mock.calls[0][1].headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('bcast_bc1_abc');
  });

  it('idempotencyKey가 없으면 헤더를 보내지 않는다', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: 'm1' }] }),
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await sendBatch([{ from: 'a@x.com', to: 'b@y.com', subject: 's', html: '<p>h</p>' }]);

    const headers = (fetchMock as jest.Mock).mock.calls[0][1].headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBeUndefined();
  });

  it('reply_to를 batch item payload에 포함한다', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: 'm1' }] }),
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await sendBatch([
      {
        from: 'a@x.com',
        to: 'b@y.com',
        subject: 's',
        html: '<p>h</p>',
        reply_to: 'hello+row1@saf2026.com',
      },
    ]);

    const body = JSON.parse((fetchMock as jest.Mock).mock.calls[0][1].body as string);
    expect(body[0].reply_to).toBe('hello+row1@saf2026.com');
  });
});
