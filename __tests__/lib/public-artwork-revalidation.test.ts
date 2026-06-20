import {
  normalizeRevalidationArtistNames,
  resolvePublicArtworkRevalidationConfig,
} from '@/lib/admin/public-artwork-revalidation';

describe('public artwork revalidation config', () => {
  it('uses NEXT_PUBLIC_SITE_URL without trailing slash when CRON_SECRET exists', () => {
    expect(
      resolvePublicArtworkRevalidationConfig({
        NEXT_PUBLIC_SITE_URL: 'https://www.saf2026.com/',
        CRON_SECRET: 'secret-1',
      } as NodeJS.ProcessEnv)
    ).toEqual({
      ok: true,
      baseUrl: 'https://www.saf2026.com',
      cronSecret: 'secret-1',
    });
  });

  it('uses VERCEL_URL as https fallback when public site url is absent', () => {
    expect(
      resolvePublicArtworkRevalidationConfig({
        VERCEL_URL: 'saf-2026.vercel.app',
        CRON_SECRET: 'secret-1',
      } as NodeJS.ProcessEnv)
    ).toEqual({
      ok: true,
      baseUrl: 'https://saf-2026.vercel.app',
      cronSecret: 'secret-1',
    });
  });

  it('returns exact missing env names instead of silently degrading', () => {
    expect(resolvePublicArtworkRevalidationConfig({} as NodeJS.ProcessEnv)).toEqual({
      ok: false,
      missing: ['NEXT_PUBLIC_SITE_URL or VERCEL_URL', 'CRON_SECRET'],
    });
  });

  it('normalizes and deduplicates artist names', () => {
    expect(normalizeRevalidationArtistNames([' 오윤 ', null, '', '오윤', '박생광'])).toEqual([
      '오윤',
      '박생광',
    ]);
  });
});
