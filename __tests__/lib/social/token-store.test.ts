import { refreshAccessToken } from '@/lib/social/token-store';
import { SocialPublishError } from '@/lib/social/types';

// token-store는 saveToken/getStoredToken에서 admin 클라이언트를 쓰지만,
// refreshAccessToken은 metaGet(fetch)만 사용 → fetch만 모킹해 검증.

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fn = jest.fn(async () => ({
    ok,
    status,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
  global.fetch = fn;
  return fn as unknown as jest.Mock;
}

describe('refreshAccessToken', () => {
  const origFetch = global.fetch;
  afterEach(() => {
    global.fetch = origFetch;
  });

  it('Instagram: ig_refresh_token 엔드포인트로 현재 토큰을 보내고 새 토큰을 파싱', async () => {
    const fetchMock = mockFetchOnce({
      access_token: 'NEW_IG_TOKEN',
      token_type: 'bearer',
      expires_in: 5184000,
    });

    const result = await refreshAccessToken('instagram', 'OLD_IG_TOKEN');

    expect(result).toEqual({
      accessToken: 'NEW_IG_TOKEN',
      tokenType: 'bearer',
      expiresIn: 5184000,
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('graph.instagram.com/refresh_access_token');
    expect(url).toContain('grant_type=ig_refresh_token');
    expect(url).toContain('access_token=OLD_IG_TOKEN');
  });

  it('Threads: th_refresh_token 엔드포인트(graph.threads.net) 사용', async () => {
    const fetchMock = mockFetchOnce({ access_token: 'NEW_TH', expires_in: 5184000 });
    await refreshAccessToken('threads', 'OLD_TH');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('graph.threads.net/refresh_access_token');
    expect(url).toContain('grant_type=th_refresh_token');
  });

  it('access_token 없는 응답이면 SocialPublishError', async () => {
    mockFetchOnce({ error: { message: 'token too fresh', code: 1 } }, false, 400);
    await expect(refreshAccessToken('instagram', 'OLD')).rejects.toBeInstanceOf(SocialPublishError);
  });
});
