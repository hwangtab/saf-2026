import { getTranslations, getLocale } from 'next-intl/server';
import { ImageIcon, Palette } from 'lucide-react';
import LinkButton from '@/components/ui/LinkButton';
import ScrollToTopOnMount from '@/components/common/ScrollToTopOnMount';
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
      <ScrollToTopOnMount />
      <div className="text-center max-w-md px-6">
        <ImageIcon aria-hidden="true" className="mx-auto h-16 w-16 text-charcoal-muted mb-6" />
        <h1 className="text-2xl font-bold text-charcoal mb-4">{t('artworkTitle')}</h1>
        <p className="text-charcoal-muted mb-8 leading-relaxed">{t('artworkDescription')}</p>
        <LinkButton
          href="/artworks"
          variant="primary"
          size="sm"
          leadingIcon={<Palette className="h-5 w-5" />}
          className="px-6 py-3 shadow-sm hover:shadow-md min-h-[48px]"
        >
          {t('artworkCta')}
        </LinkButton>
      </div>
    </div>
  );
}
