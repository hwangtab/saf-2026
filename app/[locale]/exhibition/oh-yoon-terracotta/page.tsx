import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import LinkButton from '@/components/ui/LinkButton';
import SafeImage from '@/components/common/SafeImage';
import MasterArtistGallery from '@/components/special/MasterArtistGallery';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { getArtworksByExhibition } from '@/lib/supabase-data';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import { resolveLocale } from '@/lib/server-locale';
import { createLocaleAlternates } from '@/lib/locale-alternates';
import { createStandardPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { resolveEnRobots } from '@/lib/en-indexable';
import { SITE_URL } from '@/lib/constants';
import type { Artwork, ArtworkListItem } from '@/types';

export const dynamic = 'force-static';

const PAGE_PATH = '/exhibition/oh-yoon-terracotta';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta' });

  const title = t('heroTitle');
  const description = t('heroDescription');

  const base = createStandardPageMetadata(title, description, PAGE_URL, PAGE_PATH, locale);

  // EN_INDEXABLE_PAGES에 등록된 색인 대상 — en도 index 허용
  const robots = resolveEnRobots(locale, true);

  return {
    ...base,
    alternates: createLocaleAlternates(PAGE_PATH, locale, false),
    ...(robots && { robots }),
  };
}

export default async function ExhibitionOhYoonTerracottaPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta' });
  const tOhYoon = await getTranslations({ locale, namespace: 'petition.ohYoon' });

  const artworks = await getArtworksByExhibition(OH_YOON_TERRACOTTA_EXHIBITION.slug);

  // OhYoonFeature.tsx:147-149의 매핑을 그대로 따른다.
  // ArtworkListItem = Omit<HydratedArtwork, 'profile' | 'history' | 'profile_en' | 'history_en'>
  const listArtworks: ArtworkListItem[] = artworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: locale === 'en' ? 'Home' : '홈', url: SITE_URL },
    { name: t('breadcrumb'), url: PAGE_URL },
  ]);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero title={t('heroTitle')} description={t('heroDescription')}>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.fundingHref} variant="primary">
            {t('fundingCta')}
          </LinkButton>
          <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.petitionHref} variant="secondary">
            {t('petitionCta')}
          </LinkButton>
        </div>
      </PageHero>

      {/* 위기 한 줄 — 어두운 배경 + 흰 글자 띠 (petition 페이지 §2 미러링) */}
      <section className="bg-charcoal-deep text-white py-6 px-4">
        <p className="container-max max-w-3xl mx-auto text-center text-base md:text-xl font-medium leading-relaxed break-keep text-balance">
          {tOhYoon('crisis')}
        </p>
      </section>

      {/* 스토리 섹션 — 히어로와 갤러리 사이 (petition 페이지 §3 미러링) */}
      <Section variant="white" className="py-20 md:py-24">
        <div className="container-max max-w-5xl mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <SectionTitle as="h2" className="mb-8 md:mb-10">
              {tOhYoon('storyHeading')}
            </SectionTitle>

            {/* 인용 — 작가 초상 + blockquote */}
            <aside
              aria-label={tOhYoon('storyTributeLabel')}
              className="mb-10 rounded-2xl bg-canvas px-6 py-7 md:px-8 md:py-8"
            >
              <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center md:gap-8">
                <figure className="flex flex-col items-center md:items-start">
                  <div className="w-28 h-28 md:w-32 md:h-32 overflow-hidden rounded-full border-4 border-white shadow-md">
                    <SafeImage
                      src="/images/ohyoon.webp"
                      alt={tOhYoon('storyPortraitAlt')}
                      width={256}
                      height={256}
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                  <figcaption className="mt-3 text-center md:text-left">
                    <span className="block text-sm font-semibold text-charcoal-deep">
                      {tOhYoon('storyPortraitName')}
                    </span>
                    <span className="block text-xs text-charcoal-muted tracking-wider mt-0.5">
                      {tOhYoon('storyPortraitCaption')}
                    </span>
                  </figcaption>
                </figure>
                <blockquote className="relative md:pl-2">
                  <span
                    aria-hidden="true"
                    className="absolute -left-1 -top-4 md:-left-2 md:-top-5 text-6xl md:text-7xl leading-none text-charcoal/15 font-display font-black select-none"
                  >
                    &ldquo;
                  </span>
                  <p className="relative font-display font-bold italic text-xl md:text-2xl leading-snug text-charcoal-deep break-keep">
                    {tOhYoon('storyQuote')}
                  </p>
                  <footer className="mt-3 text-xs md:text-sm text-charcoal-muted tracking-widest uppercase">
                    — {tOhYoon('storyQuoteAttribution')}
                  </footer>
                </blockquote>
              </div>
            </aside>

            {/* 작품 이야기 3단락 */}
            <div className="space-y-6 text-base md:text-lg leading-relaxed text-charcoal break-keep">
              <p>{tOhYoon('storyP1')}</p>
              <p>{tOhYoon('storyP2')}</p>
              <p>{tOhYoon('storyP3')}</p>
            </div>
          </div>

          {/* 작품 사진 3장 — petition 페이지 §3 미러링 */}
          <figure className="mt-10 grid gap-3 md:grid-cols-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <SafeImage
                src="/images/petition-oh-yoon/mural-1.webp"
                alt={tOhYoon('muralAltFront')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <SafeImage
                src="/images/petition-oh-yoon/mural-2.webp"
                alt={tOhYoon('muralAltDetail')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <SafeImage
                src="/images/petition-oh-yoon/mural-3.webp"
                alt={tOhYoon('muralAltBack')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
              <div className="absolute top-2 left-2 rounded bg-white/90 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-charcoal-deep">
                {tOhYoon('muralOtherSideBadge')}
              </div>
            </div>
            <figcaption className="md:col-span-3 text-xs text-charcoal-muted text-center mt-1">
              {tOhYoon('muralCaption')}
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* 왜 지금인가 섹션 — petition 페이지 §7 미러링 */}
      <Section variant="canvas" className="py-20 md:py-24">
        <div className="container-max max-w-3xl mx-auto px-4">
          <SectionTitle as="h2" className="mb-8 md:mb-10">
            {tOhYoon('urgencyHeading')}
          </SectionTitle>
          <p className="text-lg md:text-xl font-semibold text-charcoal-deep leading-relaxed break-keep text-balance mb-8">
            {tOhYoon('urgencyLead')}
          </p>
          <div className="rounded-xl bg-white border border-gallery-hairline p-6">
            <p className="text-sm font-semibold text-charcoal-muted mb-3 uppercase tracking-wide">
              {tOhYoon('urgencyNote')}
            </p>
            <ul className="space-y-2 text-base text-charcoal break-keep">
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ·
                </span>
                <span>{tOhYoon('urgencyBullet1')}</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ·
                </span>
                <span>{tOhYoon('urgencyBullet2')}</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ·
                </span>
                <span>{tOhYoon('urgencyBullet3')}</span>
              </li>
            </ul>
          </div>
          <p className="mt-8 text-base md:text-lg leading-relaxed text-charcoal-muted break-keep text-balance">
            {tOhYoon('urgencyTail')}
          </p>
        </div>
      </Section>

      {/* 기금마련전 연결부 — 이 전시 수익은 테라코타 이전 기금 (신규 키, petition 상호부조 대출과 구별) */}
      <Section variant="white" className="py-20 md:py-24">
        <div className="container-max max-w-3xl mx-auto px-4">
          <SectionTitle as="h2" className="mb-6 md:mb-8">
            {t('storyConnectHeading')}
          </SectionTitle>
          <p className="text-base md:text-lg leading-relaxed text-charcoal break-keep">
            {t('storyConnectBody')}
          </p>
        </div>
      </Section>

      {/* 갤러리 섹션 */}
      <Section>
        {listArtworks.length === 0 ? (
          <p className="text-center text-charcoal-muted">{t('emptyState')}</p>
        ) : (
          <MasterArtistGallery
            artworks={listArtworks}
            returnTo="%2Fexhibition%2Foh-yoon-terracotta"
          />
        )}
      </Section>
    </>
  );
}
