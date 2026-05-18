import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import ArtworkGridCard from '@/components/features/ArtworkGridCard';
import { getEntryLevelArtworks } from '@/lib/entry-level';
import { ArrowRight } from 'lucide-react';

/**
 * 30만원 이하 첫 그림 [H] — 매뉴얼 6.4 + 9.2 컬렉션 4.
 *
 * 페르소나 A·1단 첫 구매자 진입 동선. 8점 그리드 (모바일 2열·태블릿 3열·데스크탑 4열).
 * 카드는 ArtworkGridCard (Sprint 6에서 공통 추출) — hydration 0.
 */
export default async function EntryLevelArtworks({ locale }: { locale: string }) {
  const artworks = await getEntryLevelArtworks(8);
  if (artworks.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'home.entryLevel' });
  const tCard = await getTranslations({ locale, namespace: 'artworkCard' });

  return (
    <Section variant="canvas-soft" className="py-16 md:py-20">
      <div className="container-max">
        <div className="text-center mb-10 md:mb-12">
          <SectionTitle className="mb-3">{t('title')}</SectionTitle>
          <p className="text-body-large text-charcoal-muted text-balance">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
          {artworks.map((artwork) => (
            <ArtworkGridCard
              key={artwork.id}
              artwork={artwork}
              locale={locale}
              returnTo="%2F"
              untitledLabel={tCard('untitled')}
              unknownArtistLabel={tCard('unknownArtist')}
              pendingInfoLabel={tCard('pendingInfo')}
              originalKoreanDataLabel={tCard('originalKoreanData')}
              soldLabel={tCard('soldBadge')}
              reservedLabel={tCard('reservedBadge')}
              pendingValueLabel={tCard('pendingValue')}
              inquiryValueLabel={tCard('inquiryValue')}
              sizesOverride="(max-width: 640px) calc(50vw - 1.5rem), (max-width: 1024px) calc(33vw - 1.5rem), 280px"
            />
          ))}
        </div>
        {/* viewAll CTA — ArtworkCategoryGrid 카테고리 섹션과 동일 rounded-full 버튼 톤으로 정합. */}
        <div className="mt-10 md:mt-12 flex justify-center">
          <Link
            href="/artworks"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm md:text-base font-semibold border border-charcoal/20 text-charcoal bg-white hover:bg-canvas hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow,background-color] duration-300"
          >
            {t('viewAll')}
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </Section>
  );
}
