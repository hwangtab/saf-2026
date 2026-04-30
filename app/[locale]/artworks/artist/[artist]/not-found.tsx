import { getTranslations, getLocale } from 'next-intl/server';
import { Palette } from 'lucide-react';
import LinkButton from '@/components/ui/LinkButton';
import ScrollToTopOnMount from '@/components/common/ScrollToTopOnMount';
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
      <ScrollToTopOnMount />
      <div className="max-w-md px-6 text-center">
        <Palette aria-hidden="true" className="mx-auto h-16 w-16 text-charcoal-muted mb-6" />
        <h1 className="mb-4 text-2xl font-bold text-charcoal">{t('artistTitle')}</h1>
        <p className="mb-8 leading-relaxed text-charcoal-muted">{t('artistDescription')}</p>
        <LinkButton href="/artworks" variant="primary">
          {t('artistCta')}
        </LinkButton>
      </div>
    </div>
  );
}
