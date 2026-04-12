import { getTranslations, getLocale } from 'next-intl/server';
import LinkButton from '@/components/ui/LinkButton';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale().catch(() => 'ko');
  return {
    title: locale === 'en' ? 'Artwork Not Found' : '작품을 찾을 수 없습니다',
    robots: { index: false, follow: true },
  };
}

export default async function ArtworkNotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-soft pt-20">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6" aria-hidden="true">
          🖼️
        </div>
        <h1 className="text-2xl font-bold text-charcoal mb-4">{t('artworkTitle')}</h1>
        <p className="text-charcoal-muted mb-8 leading-relaxed">{t('artworkDescription')}</p>
        <LinkButton
          href="/artworks"
          variant="primary"
          size="sm"
          className="inline-grid grid-cols-[1.25rem_auto_1.25rem] gap-2 px-6 py-3 shadow-sm hover:shadow-md min-h-[48px]"
        >
          <span aria-hidden="true">🎨</span>
          <span>{t('artworkCta')}</span>
          <span aria-hidden="true" className="invisible">
            🎨
          </span>
        </LinkButton>
      </div>
    </div>
  );
}
