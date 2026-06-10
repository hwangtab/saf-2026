import { getAdapter, getPlatformConfigStatuses, isPlatformConfigured } from '@/lib/social/registry';

describe('social registry', () => {
  const keys = [
    'INSTAGRAM_USER_ID',
    'INSTAGRAM_ACCESS_TOKEN',
    'THREADS_USER_ID',
    'THREADS_ACCESS_TOKEN',
  ] as const;
  const orig: Record<string, string | undefined> = {};

  beforeEach(() => {
    keys.forEach((k) => {
      orig[k] = process.env[k];
      delete process.env[k];
    });
  });

  afterEach(() => {
    keys.forEach((k) => {
      if (orig[k] === undefined) delete process.env[k];
      else process.env[k] = orig[k];
    });
  });

  it('env 미설정이면 모든 플랫폼 미구성', () => {
    expect(isPlatformConfigured('instagram')).toBe(false);
    expect(isPlatformConfigured('threads')).toBe(false);
  });

  it('Instagram env만 설정하면 instagram만 구성됨', () => {
    process.env.INSTAGRAM_USER_ID = 'x';
    process.env.INSTAGRAM_ACCESS_TOKEN = 'y';
    expect(isPlatformConfigured('instagram')).toBe(true);
    expect(isPlatformConfigured('threads')).toBe(false);
  });

  it('getPlatformConfigStatuses가 두 플랫폼 상태를 모두 반환', () => {
    process.env.THREADS_USER_ID = 'a';
    process.env.THREADS_ACCESS_TOKEN = 'b';
    const statuses = getPlatformConfigStatuses();
    expect(statuses).toEqual([
      { platform: 'instagram', configured: false },
      { platform: 'threads', configured: true },
    ]);
  });

  it('getAdapter는 플랫폼별 어댑터를 반환', () => {
    expect(getAdapter('instagram').platform).toBe('instagram');
    expect(getAdapter('threads').platform).toBe('threads');
  });
});
