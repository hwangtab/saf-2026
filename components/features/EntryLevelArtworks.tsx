import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { getEntryLevelArtworks } from '@/lib/entry-level';
import { ArrowRight } from 'lucide-react';
import type { ArtworkCardData } from '@/types';

/**
 * 30만원 이하 첫 그림 [H] — 매뉴얼 6.4 + 9.2 컬렉션 4.
 *
 * 페르소나 A·1단 첫 구매자 진입 동선. 메인 페이지에서 가장 가격 부담이 낮은 시작점.
 * 8점 그리드 (모바일 2열·태블릿 3열·데스크탑 4열). MasterArtists[E] 직후 노출.
 *
 * 데이터: lib/entry-level.ts의 가격 필터 (₩100,000~₩300,000) + 작가 단위 dedupe + sold/reserved 제외.
 * 풀이 8점 미만이면 노출 가능한 만큼만, 0점이면 섹션 자체 미렌더.
 */
export default async function EntryLevelArtworks({ locale }: { locale: string }) {
  const artworks = await getEntryLevelArtworks(8);
  if (artworks.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'home.entryLevel' });

  return (
    <Section variant="canvas-soft" className="py-16 md:py-20">
      <div className="container-max">
        <div className="text-center mb-10 md:mb-12">
          <SectionTitle className="mb-3">{t('title')}</SectionTitle>
          <p className="text-body-large text-charcoal-muted text-balance">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
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
