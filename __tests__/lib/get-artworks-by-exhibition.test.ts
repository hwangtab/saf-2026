// Mock next/cache to avoid jsdom Request is not defined error
jest.mock('next/cache', () => ({
  unstable_cache: (fn: Function) => fn,
}));

// Mock react cache as passthrough
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn: Function) => fn,
}));

describe('getArtworksByExhibition', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('Supabase 미구성 시 빈 배열을 반환한다', async () => {
    const { getArtworksByExhibition } = await import('@/lib/supabase-data');
    const result = await getArtworksByExhibition('oh-yoon-terracotta');
    expect(result).toEqual([]);
  });
});
