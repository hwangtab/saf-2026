import { threadsAdapter } from '@/lib/social/threads';

// 토큰은 DB-first 해석 — 테스트에선 DB를 건너뛰고 env fallback을 그대로 사용.
jest.mock('@/lib/social/token-store', () => ({
  resolveAccessToken: jest.fn(async (_platform: string, envFallback: string | null) => envFallback),
}));

// 지연은 즉시 resolve — 폴링/세그먼트/재시도 delay로 테스트가 느려지지 않게.
jest.mock('@/lib/social/sleep', () => ({ sleep: jest.fn(async () => {}) }));

type MockResponse = { ok?: boolean; status?: number; body: unknown };

function mockFetchSequence(responses: MockResponse[]) {
  const fn = jest.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('fetch called more times than mocked');
    return {
      ok: next.ok ?? true,
      status: next.status ?? 200,
      text: async () => JSON.stringify(next.body),
    } as unknown as Response;
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('threadsAdapter', () => {
  const origFetch = global.fetch;
  const origUserId = process.env.THREADS_USER_ID;
  const origToken = process.env.THREADS_ACCESS_TOKEN;

  beforeEach(() => {
    process.env.THREADS_USER_ID = 'th-1';
    process.env.THREADS_ACCESS_TOKEN = 'th-tok';
  });

  afterEach(() => {
    global.fetch = origFetch;
    process.env.THREADS_USER_ID = origUserId;
    process.env.THREADS_ACCESS_TOKEN = origToken;
  });

  it('env 없으면 isConfigured false', () => {
    delete process.env.THREADS_USER_ID;
    expect(threadsAdapter.isConfigured()).toBe(false);
  });

  it('이미지 게시: media_type=IMAGE 컨테이너 → 상태 FINISHED → publish', async () => {
    const fetchMock = mockFetchSequence([
      { body: { id: 'c-1' } }, // create
      { body: { status: 'FINISHED' } }, // status poll
      { body: { id: 'm-1' } }, // publish
      { body: { permalink: 'https://www.threads.net/@x/post/1' } }, // permalink
    ]);

    const result = await threadsAdapter.publish({
      caption: '글',
      imageUrl: 'https://cdn/x.jpg',
    });
    expect(result.platformPostId).toBe('m-1');
    expect(result.permalink).toBe('https://www.threads.net/@x/post/1');

    const createBody = String((fetchMock.mock.calls[0][1] as RequestInit).body);
    expect(createBody).toContain('media_type=IMAGE');
    expect(createBody).toContain('image_url=');

    const publishUrl = String(fetchMock.mock.calls[2][0]);
    expect(publishUrl).toContain('/th-1/threads_publish');
  });

  it('텍스트 게시: 이미지 없으면 media_type=TEXT', async () => {
    const fetchMock = mockFetchSequence([
      { body: { id: 'c-2' } },
      { body: { status: 'FINISHED' } },
      { body: { id: 'm-2' } },
      { body: { permalink: null } },
    ]);

    const result = await threadsAdapter.publish({ caption: '텍스트만' });
    expect(result.platformPostId).toBe('m-2');

    const createBody = String((fetchMock.mock.calls[0][1] as RequestInit).body);
    expect(createBody).toContain('media_type=TEXT');
    expect(createBody).not.toContain('image_url=');
  });

  it('컨테이너 상태 ERROR면 게시 실패', async () => {
    mockFetchSequence([{ body: { id: 'c-3' } }, { body: { status: 'ERROR' } }]);
    await expect(
      threadsAdapter.publish({ caption: 'x', imageUrl: 'https://cdn/x.jpg' })
    ).rejects.toThrow(/처리에 실패/);
  });

  it('본문도 이미지도 없으면 거부', async () => {
    await expect(threadsAdapter.publish({ caption: '   ' })).rejects.toThrow(
      /본문 또는 이미지가 필요/
    );
  });

  it('긴 글(--- 분할)은 답글 체인으로 게시: 둘째 글에 reply_to_id=첫 글 media id', async () => {
    const fetchMock = mockFetchSequence([
      { body: { id: 'c1' } }, // seg1 create
      { body: { status: 'FINISHED' } }, // seg1 status
      { body: { id: 'm1' } }, // seg1 publish
      { body: { id: 'c2' } }, // seg2 create (reply)
      { body: { status: 'FINISHED' } }, // seg2 status
      { body: { id: 'm2' } }, // seg2 publish
      { body: { permalink: 'https://www.threads.net/@x/post/1' } }, // permalink(첫 글)
    ]);

    const result = await threadsAdapter.publish({ caption: '첫 글\n---\n둘째 글' });

    // 스레드 첫 글 media id가 대표값
    expect(result.platformPostId).toBe('m1');

    const seg1Body = String((fetchMock.mock.calls[0][1] as RequestInit).body);
    expect(seg1Body).toContain('text=');
    expect(seg1Body).not.toContain('reply_to_id');

    const seg2Body = String((fetchMock.mock.calls[3][1] as RequestInit).body);
    expect(seg2Body).toContain('reply_to_id=m1');
    expect(seg2Body).toContain('media_type=TEXT');
  });

  it('일시 오류(code 24)면 컨테이너를 새로 만들어 재시도 후 성공', async () => {
    mockFetchSequence([
      { body: { id: 'c1' } }, // 1차 create
      { body: { status: 'FINISHED' } }, // 1차 status
      // 1차 publish — 일시 오류(미디어 없음, code 24)
      { ok: false, status: 400, body: { error: { message: 'does not exist', code: 24 } } },
      { body: { id: 'c1b' } }, // 재시도 create
      { body: { status: 'FINISHED' } }, // 재시도 status
      { body: { id: 'm1' } }, // 재시도 publish 성공
      { body: { permalink: 'https://www.threads.net/@x/post/1' } },
    ]);

    const result = await threadsAdapter.publish({ caption: '짧은 글', imageUrl: 'https://cdn/x.jpg' });
    expect(result.platformPostId).toBe('m1');
  });

  it('컨테이너가 끝까지 FINISHED 안 되면 publish 안 하고 실패(안 익은 컨테이너 발행 금지)', async () => {
    // 모든 status 폴링이 IN_PROGRESS → 재시도까지 모두 타임아웃
    const inProgress = { body: { status: 'IN_PROGRESS' } };
    const seq: MockResponse[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      seq.push({ body: { id: `c${attempt}` } }); // create
      for (let p = 0; p < 20; p += 1) seq.push(inProgress); // status 폴링(MAX_STATUS_CHECKS)
    }
    mockFetchSequence(seq);

    await expect(
      threadsAdapter.publish({ caption: '글', imageUrl: 'https://cdn/x.jpg' })
    ).rejects.toThrow(/지연되어 게시하지 못/);
  });
});
