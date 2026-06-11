import { instagramAdapter } from '@/lib/social/instagram';
import { SocialPublishError } from '@/lib/social/types';

// 토큰은 DB-first 해석 — 테스트에선 DB를 건너뛰고 env fallback을 그대로 사용.
jest.mock('@/lib/social/token-store', () => ({
  resolveAccessToken: jest.fn(async (_platform: string, envFallback: string | null) => envFallback),
}));
// 지연은 즉시 resolve — 폴링/재시도 delay로 테스트가 느려지지 않게.
jest.mock('@/lib/social/sleep', () => ({ sleep: jest.fn(async () => {}) }));

type MockResponse = { ok?: boolean; status?: number; body: unknown };
const FINISHED = { body: { status_code: 'FINISHED' } };

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

describe('instagramAdapter', () => {
  const origFetch = global.fetch;
  const origUserId = process.env.INSTAGRAM_USER_ID;
  const origToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  beforeEach(() => {
    process.env.INSTAGRAM_USER_ID = 'ig-123';
    process.env.INSTAGRAM_ACCESS_TOKEN = 'tok-abc';
  });

  afterEach(() => {
    global.fetch = origFetch;
    process.env.INSTAGRAM_USER_ID = origUserId;
    process.env.INSTAGRAM_ACCESS_TOKEN = origToken;
  });

  it('isConfigured는 env가 모두 있으면 true', () => {
    expect(instagramAdapter.isConfigured()).toBe(true);
  });

  it('env가 없으면 isConfigured false, publish 시 명확한 에러', async () => {
    delete process.env.INSTAGRAM_USER_ID;
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    expect(instagramAdapter.isConfigured()).toBe(false);
    await expect(
      instagramAdapter.publish({ caption: 'hi', imageUrl: 'https://x/a.jpg' })
    ).rejects.toThrow(/환경 변수/);
  });

  it('이미지가 없으면 게시 거부', async () => {
    await expect(instagramAdapter.publish({ caption: 'hi' })).rejects.toThrow(/이미지가 필요/);
  });

  it('컨테이너 생성 → 처리 대기 → media_publish → permalink 순으로 호출', async () => {
    const fetchMock = mockFetchSequence([
      { body: { id: 'container-1' } },
      FINISHED,
      { body: { id: 'media-1' } },
      { body: { permalink: 'https://www.instagram.com/p/abc/' } },
    ]);

    const result = await instagramAdapter.publish({
      caption: '캡션',
      imageUrl: 'https://cdn/x.jpg',
    });

    expect(result).toEqual({
      platformPostId: 'media-1',
      permalink: 'https://www.instagram.com/p/abc/',
    });

    const [createUrl, createInit] = fetchMock.mock.calls[0];
    expect(String(createUrl)).toContain('/ig-123/media');
    expect(String((createInit as RequestInit).body)).toContain('image_url=');

    // calls[1] = 상태 폴링, calls[2] = media_publish
    const [publishUrl, publishInit] = fetchMock.mock.calls[2];
    expect(String(publishUrl)).toContain('/ig-123/media_publish');
    expect(String((publishInit as RequestInit).body)).toContain('creation_id=container-1');
  });

  it('permalink 조회 실패해도 게시는 성공으로 처리', async () => {
    mockFetchSequence([
      { body: { id: 'container-1' } },
      FINISHED,
      { body: { id: 'media-9' } },
      { ok: false, status: 400, body: { error: { message: 'no perm', code: 100 } } },
    ]);

    const result = await instagramAdapter.publish({ caption: 'c', imageUrl: 'https://cdn/x.jpg' });
    expect(result.platformPostId).toBe('media-9');
    expect(result.permalink).toBeNull();
  });

  it('Meta 에러 응답이면 SocialPublishError로 메시지 노출', async () => {
    mockFetchSequence([
      { ok: false, status: 400, body: { error: { message: 'Invalid image', code: 100 } } },
    ]);
    await expect(
      instagramAdapter.publish({ caption: 'c', imageUrl: 'https://cdn/x.jpg' })
    ).rejects.toThrow(/Invalid image/);
  });

  it('토큰 만료(190)는 재발급 안내 메시지', async () => {
    mockFetchSequence([
      { ok: false, status: 400, body: { error: { message: 'expired', code: 190 } } },
    ]);
    await expect(
      instagramAdapter.publish({ caption: 'c', imageUrl: 'https://cdn/x.jpg' })
    ).rejects.toThrow(/토큰/);
  });

  it('"Media ID is not available"(일시 오류)면 컨테이너 새로 만들어 재시도 후 성공', async () => {
    mockFetchSequence([
      { body: { id: 'c1' } },
      FINISHED,
      { ok: false, status: 400, body: { error: { message: 'Media ID is not available' } } },
      { body: { id: 'c2' } }, // 재시도: 컨테이너 재생성
      FINISHED,
      { body: { id: 'media-ok' } },
      { body: { permalink: null } },
    ]);
    const result = await instagramAdapter.publish({ caption: 'c', imageUrl: 'https://cdn/x.jpg' });
    expect(result.platformPostId).toBe('media-ok');
  });

  it('캡션 2200자 초과는 축약하고 --- 구분자는 제거', async () => {
    const fetchMock = mockFetchSequence([
      { body: { id: 'c' } },
      FINISHED,
      { body: { id: 'm' } },
      { body: { permalink: null } },
    ]);
    const long = `${'A'.repeat(2500)}\n---\n${'B'.repeat(100)}`;
    await instagramAdapter.publish({ caption: long, imageUrl: 'https://cdn/x.jpg' });

    const body = String((fetchMock.mock.calls[0][1] as RequestInit).body);
    const sent = new URLSearchParams(body).get('caption') ?? '';
    expect(sent.length).toBeLessThanOrEqual(2200);
    expect(sent).not.toContain('---');
  });

  it('SocialPublishError 타입으로 throw', async () => {
    mockFetchSequence([{ ok: false, status: 500, body: {} }]);
    await expect(
      instagramAdapter.publish({ caption: 'c', imageUrl: 'https://cdn/x.jpg' })
    ).rejects.toBeInstanceOf(SocialPublishError);
  });
});
