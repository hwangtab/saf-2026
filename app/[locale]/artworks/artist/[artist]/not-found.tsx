import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale().catch(() => 'ko');
  return {
    title: locale === 'en' ? 'Artist Not Found' : '작가를 찾을 수 없습니다',
    robots: { index: false, follow: true },
  };
}

export default async function ArtistNotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft pt-20">
      <div className="max-w-md px-6 text-center">
        <div className="mb-6 text-6xl" aria-hidden="true">
          🎨
        </div>
        <h1 className="mb-4 text-2xl font-bold text-charcoal">{t('artistTitle')}</h1>
        <p className="mb-8 leading-relaxed text-charcoal-muted">{t('artistDescription')}</p>
        <Link
          href="/artworks"
          className="inline-grid min-h-[48px] grid-cols-[1.25rem_auto_1.25rem] items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white shadow-sm transition-colors hover:bg-primary-strong hover:shadow-md"
        >
          <span aria-hidden="true">🖼️</span>
          <span>{t('artistCta')}</span>
          <span aria-hidden="true" className="invisible">
            🖼️
          </span>
        </Link>
      </div>
    </div>
  );
}
