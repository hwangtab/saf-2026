import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { MASTER_ARTISTS } from '@/lib/master-artists';
import { getSupabaseArtworksByArtist } from '@/lib/supabase-data';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { SITE_URL } from '@/lib/constants';
import { ArrowRight } from 'lucide-react';

/**
 * 한국 현대미술 거장 영역 [E] — 매뉴얼 6.4 + 9.2 컬렉션 2 (운영 큐레이션 반영).
 *
 * 메인 페이지 NowShowing 직후 노출. 페르소나 B의 "왜 이 사이트인가" 첫 인지 자산.
 * 현재 5명 거장 카드 그리드 (모바일 2열·데스크탑 5열) → 작가 페이지로 deep-link.
 *
 * 데이터:
 * - 메타(이름·생몰년·부제)는 lib/master-artists.ts 정적 정의 (운영 큐레이션 결과 반영)
 * - 카드 이미지는 작가별 대표작 1점을 Supabase에서 fetch (이미 cached: getSupabaseArtworksByArtist)
 * - force-static + revalidate=3600 하 캐시 HIT
 *
 * 작가가 Supabase에 아직 없거나 작품 0건이면 카드 자체 미렌더 (안전 fallback).
 * GSC 구조화 데이터: ItemList schema로 작가 라인업 entity 노출.
 */
export default async function MasterArtists({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.masterArtists' });
  const isEn = locale === 'en';

  // 작가별 1점 representative 작품을 병렬 fetch. 데이터 없으면 카드 fallback.
  const cardsRaw = await Promise.all(
    MASTER_ARTISTS.map(async (artist) => {
      const works = await getSupabaseArtworksByArtist(artist.artistName);
      const cover = works[0];
      return { artist, cover };
    })
  );

  // 작가 데이터가 있는 카드만 노출 (작품 0건이면 작가 페이지가 비어 있어 deep-link 의미 없음).
  const cards = cardsRaw.filter(({ cover }) => cover);
  if (cards.length === 0) return null;

  // ItemList schema — 거장 라인업을 GSC structured data entity로. Person 엔티티 5개.
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('title'),
    itemListElement: cards.map(({ artist }, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Person',
        name: isEn ? artist.artistNameEn : artist.artistName,
        url: artist.specialSlug
          ? `${SITE_URL}${isEn ? '/en' : ''}/special/${artist.specialSlug}`
          : `${SITE_URL}${isEn ? '/en' : ''}/artworks/artist/${encodeURIComponent(artist.artistName)}`,
        description: isEn ? artist.taglineEn : artist.taglineKo,
      },
    })),
  };

  return (
    <Section variant="white" className="py-16 md:py-20">
      <JsonLdScript data={itemListSchema} />
      <div className="container-max">
        <div className="text-center mb-10 md:mb-12">
          <SectionTitle className="mb-3">{t('title')}</SectionTitle>
          <p className="text-body-large text-charcoal-muted text-balance">{t('subtitle')}</p>
        </div>
        {/* 5명 라인업 — 모바일 2열·태블릿 3열·데스크탑 5열 한 줄 배치. */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto">
          {cards.map(({ artist, cover }) => {
            const displayName = isEn ? artist.artistNameEn : artist.artistName;
            const displayYears = isEn ? artist.yearsEn : artist.yearsKo;
            const displayTagline = isEn ? artist.taglineEn : artist.taglineKo;
            const coverSrc = resolveArtworkImageUrlForPreset(cover!.images?.[0] ?? '', 'card');
            const href = artist.specialSlug
              ? `/special/${artist.specialSlug}`
              : `/artworks/artist/${encodeURIComponent(artist.artistName)}`;

            return (
              <Link
                key={artist.artistName}
                href={href}
                className="group block"
                aria-label={isEn ? `View ${displayName}'s works` : `${displayName} 작품 보기`}
              >
                <article className="h-full overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-square overflow-hidden bg-canvas-soft">
                    <SafeImage
                      src={coverSrc}
                      alt={isEn ? `${displayName} — representative work` : `${displayName} 대표작`}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 230px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  </div>
                  <div className="p-5">
                    <p className="text-eyebrow text-charcoal-muted mb-1">{displayYears}</p>
                    <h3 className="text-lg md:text-xl font-bold text-charcoal-deep mb-1 break-keep">
                      {displayName}
                    </h3>
                    <p className="text-sm text-charcoal-muted leading-relaxed break-keep">
                      {displayTagline}
                    </p>
                  </div>
                </article>
              </Link>
            );
          })}
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
