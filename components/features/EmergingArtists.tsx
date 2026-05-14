import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { getEmergingArtworks } from '@/lib/emerging-artists';
import { ArrowRight } from 'lucide-react';
import type { ArtworkCardData } from '@/types';

/**
 * 신진 작가 발견 영역 [G] — 매뉴얼 6.4 + 9.2 컬렉션 3.
 *
 * 페르소나 B의 "내가 먼저 발견했다" 자긍심 자극. 거장(6명) 제외 작품 풀에서 작가별 1점씩
 * 다양성 dedupe 후 6점 노출. 모바일 2열·태블릿 3열 그리드.
 *
 * 데이터: lib/emerging-artists.ts. 풀 0점이면 섹션 자체 미렌더 (안전 fallback).
 */
export default async function EmergingArtists({ locale }: { locale: string }) {
  const artworks = await getEmergingArtworks(6);
  if (artworks.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'home.emergingArtists' });

  return (
    <Section variant="white" className="py-16 md:py-20">
      <div className="container-max">
        <div className="text-center mb-10 md:mb-12">
          <SectionTitle className="mb-3">{t('title')}</SectionTitle>
          <p className="text-body-large text-charcoal-muted text-balance">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {artworks.map((artwork) => {
            // ArtworkCardData category/edition 필드는 별도 PR(Sprint 2 매체 라벨)에서 도입 — main merge 후 후속 PR로 보강.
            const cardData: ArtworkCardData = {
              id: artwork.id,
              artist: artwork.artist,
              artist_en: artwork.artist_en,
              title: artwork.title,
              title_en: artwork.title_en,
              images: artwork.images,
              price: artwork.price,
              sold: artwork.sold,
              reserved: artwork.reserved,
              sold_at: artwork.sold_at,
              material: artwork.material,
              size: artwork.size,
            };
            return (
              <ArtworkCard key={artwork.id} artwork={cardData} variant="gallery" returnTo="/" />
            );
          })}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/artworks"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-strong hover:underline"
          >
            {t('viewAll')}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Section>
  );
}
