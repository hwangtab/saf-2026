import { threadsAdapter } from '@/lib/social/threads';

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

  it('텍스트 게시인데 본문이 비면 거부', async () => {
    await expect(threadsAdapter.publish({ caption: '   ' })).rejects.toThrow(/본문이 필요/);
  });
});
