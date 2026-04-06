import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import BrandLoader from '@/components/common/BrandLoader';
import { Link } from '@/i18n/navigation';
import LinkButton from '@/components/ui/LinkButton';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import SawtoothDivider from '@/components/ui/SawtoothDivider';
import HeroGalleryGrid from '@/components/features/HeroGalleryGrid';
import BackgroundSlider from '@/components/features/BackgroundSlider';
import SafeImage from '@/components/common/SafeImage';
import { EXTERNAL_LINKS, OG_IMAGE, SITE_URL } from '@/lib/constants';
import {
  generateExhibitionSchema,
  generateFAQSchema,
  generateCampaignSchema,
} from '@/lib/seo-utils';
import { generateArtworkPurchaseHowTo, generateMemberJoinHowTo } from '@/lib/schemas/howto';
import { generateSAFCoreQA } from '@/lib/schemas/qa-page';
import {
  getSupabaseHomepageArtworks,
  getSupabaseArtworksByCategories,
  getSupabaseFAQs,
} from '@/lib/supabase-data';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { formatCurrentDate } from '@/lib/utils/format-date';
import type { Artwork } from '@/types';

export const revalidate = 1800;

const DynamicCounter = dynamic(() => import('@/components/features/DynamicCounter'));
const FAQList = dynamic(() => import('@/components/features/FAQList'));
const ArtworkHighlightSlider = dynamic(
  () => import('@/components/features/ArtworkHighlightSlider')
);

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const t = await getTranslations('home');
  const pageUrl = buildLocaleUrl('/', locale);

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    keywords:
      locale === 'en'
        ? 'Korean contemporary art, original artworks for sale, art gallery, artist mutual aid, SAF Online, Seed Art Festival, paintings, prints, sculpture, photography'
        : '한국 현대미술, 작품 구매, 미술 작품 판매, 씨앗페, 씨앗페 온라인, 예술인 상호부조, 회화, 판화, 조각, 사진',
    alternates: createLocaleAlternates('/', locale),
    openGraph: {
      type: 'website',
      siteName: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
      title: t('metaTitle'),
      description: t('ogDescription'),
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      url: pageUrl,
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaTitle'),
      description: t('twitterDescription'),
      images: [OG_IMAGE.url],
    },
  };
}

export default async function Home() {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const t = await getTranslations('home');
  const tStat = await getTranslations('statistics');

  const counterItems = [
    { label: tStat('exclusionRate'), value: 84.9, unit: tStat('unitPercent') },
    { label: tStat('predatoryLending'), value: 48.6, unit: tStat('unitPercent') },
    { label: tStat('repaymentRate'), value: 95, unit: tStat('unitPercent') },
  ];

  return (
    <>
      {/* Gallery Wall Hero */}
      <Suspense fallback={<BrandLoader minHeight="100vh" />}>
        <HeroSection locale={locale} />
      </Suspense>

      {/* Mission Banner */}
      <Section variant="canvas-soft" padding="sm">
        <div className="container-max text-center py-4 md:py-6">
          <p className="text-charcoal text-xl md:text-2xl font-semibold break-keep mb-6">
            {t('missionBanner')}
          </p>
          {/* 3-step flow */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 mb-6">
            {/* Step 1 */}
            <div className="flex items-center gap-2 bg-white rounded-xl px-5 py-3 shadow-sm">
              <span className="text-2xl" aria-hidden="true">
                🎨
              </span>
              <span className="text-sm font-semibold text-charcoal">{t('missionStep1')}</span>
            </div>
            <span className="text-charcoal-soft text-xl font-light hidden sm:block mx-3">→</span>
            <span className="text-charcoal-soft text-lg font-light sm:hidden">↓</span>
            {/* Step 2 */}
            <div className="flex items-center gap-2 bg-white rounded-xl px-5 py-3 shadow-sm">
              <span className="text-2xl" aria-hidden="true">
                💰
              </span>
              <span className="text-sm font-semibold text-charcoal">{t('missionStep2')}</span>
            </div>
            <span className="text-charcoal-soft text-xl font-light hidden sm:block mx-3">→</span>
            <span className="text-charcoal-soft text-lg font-light sm:hidden">↓</span>
            {/* Step 3 */}
            <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-5 py-3 shadow-sm border border-primary/20">
              <span className="text-2xl" aria-hidden="true">
                🤝
              </span>
              <span className="text-sm font-semibold text-primary-a11y">{t('missionStep3')}</span>
            </div>
          </div>
          <Link
            href="/our-reality"
            className="inline-flex items-center gap-1 text-sm text-charcoal-muted hover:text-primary transition-colors border-b border-charcoal-muted/30 hover:border-primary pb-0.5"
          >
            {t('missionLearnMore')} →
          </Link>
        </div>
      </Section>

      {/* Category Artwork Sections */}
      <Suspense fallback={<BrandLoader minHeight="60vh" />}>
        <CategorySections />
      </Suspense>

      {/* Impact Stats + CTA */}
      <Section variant="white" prevVariant="canvas-soft" className="pb-20">
        <div className="container-max">
          <SectionTitle className="mb-12">{t('statsTitle')}</SectionTitle>
          <DynamicCounter items={counterItems} locale={locale} />
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <LinkButton
              href={EXTERNAL_LINKS.JOIN_MEMBER}
              external
              variant="primary"
              size="lg"
              className="w-full sm:w-auto justify-center min-w-[180px]"
            >
              {t('joinMemberLink')}
            </LinkButton>
            <LinkButton
              href={EXTERNAL_LINKS.LOAN_INFO}
              external
              variant="accent"
              size="lg"
              className="w-full sm:w-auto justify-center min-w-[180px]"
            >
              {t('applyLoan')}
            </LinkButton>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="sun-soft" prevVariant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <SectionTitle className="mb-12">{t('faqTitle')}</SectionTitle>
          <Suspense fallback={<BrandLoader minHeight="30vh" />}>
            <HomeFAQSection locale={locale} />
          </Suspense>
        </div>
      </Section>

      {/* JSON-LD schemas */}
      <JsonLdScript data={generateExhibitionSchema([], locale)} />
      <JsonLdScript data={generateCampaignSchema(locale)} />
      <JsonLdScript data={generateArtworkPurchaseHowTo(locale)} />
      <JsonLdScript data={generateMemberJoinHowTo(locale)} />
      <JsonLdScript data={generateSAFCoreQA(locale)} />

      {/* Share buttons (hidden, for metadata) */}
      <div className="hidden">
        <ShareButtonsWrapper
          url={SITE_URL}
          title={t('shareTitle')}
          description={t('shareDescription')}
        />
      </div>
    </>
  );
}

// ─── Async server sub-components ──────────────────────────────────────────────

async function HeroSection({ locale }: { locale: 'ko' | 'en' }) {
  const t = await getTranslations('home');
  const artworks = await getSupabaseHomepageArtworks(16);

  return (
    <section className="relative overflow-hidden">
      <BackgroundSlider />
      <SawtoothDivider position="bottom" colorClass="text-canvas-soft" />
      <div className="relative z-10 container-max pt-16 pb-24 md:pt-20 md:pb-32">
        {/* Logo */}
        <div className="mb-6 hidden md:flex justify-center">
          <SafeImage
            src="/images/logo/320pxX90px_white.webp"
            alt={t('logoAlt')}
            width={1120}
            height={320}
            className="w-64 md:w-[36rem] h-auto drop-shadow-2xl"
            priority
            placeholder="empty"
          />
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1
            className="font-display text-3xl sm:text-4xl md:text-5xl text-white mb-3 leading-tight drop-shadow-lg motion-safe:opacity-0 motion-safe:animate-fade-in-up"
            style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
          >
            {t('heroGalleryTitle')}
          </h1>
          <p
            className="text-white/70 text-sm md:text-base motion-safe:opacity-0 motion-safe:animate-fade-in-up"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            {t('heroGallerySubtitle')}
          </p>

          {/* Always-available badge */}
          <div
            className="mt-4 flex justify-center motion-safe:opacity-0 motion-safe:animate-fade-in-up"
            style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
          >
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs text-white font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              {t('alwaysAvailable', { date: formatCurrentDate(locale) })}
            </span>
          </div>
        </div>

        {/* Gallery Grid */}
        <div
          className="motion-safe:opacity-0 motion-safe:animate-fade-in-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          <HeroGalleryGrid artworks={artworks} />
        </div>

        {/* CTA */}
        <div
          className="mt-8 flex flex-col sm:flex-row gap-4 justify-center motion-safe:opacity-0 motion-safe:animate-fade-in-up"
          style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
        >
          <LinkButton
            href="/artworks"
            variant="accent"
            size="lg"
            className="w-full sm:w-auto shadow-lg min-w-[200px] justify-center text-lg"
          >
            {t('viewArtworks')}
          </LinkButton>
          <LinkButton
            href="/our-reality"
            variant="outline-white"
            size="lg"
            className="w-full sm:w-auto backdrop-blur-sm min-w-[160px] justify-center"
          >
            {t('aboutSaf')}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

async function CategorySections() {
  const t = await getTranslations('home');

  const [paintingArtworks, printArtworks, photoMediaArtworks, sculptureArtworks] =
    await Promise.all([
      getSupabaseArtworksByCategories(['회화', '한국화', '드로잉'], 20),
      getSupabaseArtworksByCategories(['판화', '사후판화', '아트프린트'], 20),
      getSupabaseArtworksByCategories(['사진', '디지털아트', '혼합매체'], 20),
      getSupabaseArtworksByCategories(['조각', '도자/공예'], 20),
    ]);

  const sections: {
    artworks: Artwork[];
    title: string;
    viewAllHref: string;
    theme: 'dark' | 'light';
  }[] = [
    {
      artworks: paintingArtworks,
      title: t('sectionPainting'),
      viewAllHref: '/artworks?category=%ED%9A%8C%ED%99%94',
      theme: 'dark',
    },
    {
      artworks: printArtworks,
      title: t('sectionPrint'),
      viewAllHref: '/artworks?category=%ED%8C%90%ED%99%94',
      theme: 'light',
    },
    {
      artworks: photoMediaArtworks,
      title: t('sectionPhotoMedia'),
      viewAllHref: '/artworks?category=%EC%82%AC%EC%A7%84',
      theme: 'dark',
    },
    {
      artworks: sculptureArtworks,
      title: t('sectionSculpture'),
      viewAllHref: '/artworks?category=%EC%A1%B0%EA%B0%81',
      theme: 'light',
    },
  ];

  return (
    <>
      {sections.map((section) =>
        section.artworks.length > 0 ? (
          <ArtworkHighlightSlider
            key={section.title}
            artworks={section.artworks}
            title={section.title}
            viewAllHref={section.viewAllHref}
            theme={section.theme}
          />
        ) : null
      )}
    </>
  );
}

async function HomeFAQSection({ locale }: { locale: 'ko' | 'en' }) {
  const faqs = await getSupabaseFAQs(locale);

  return (
    <>
      <FAQList items={faqs} />
      {faqs.length > 0 && <JsonLdScript data={generateFAQSchema(faqs, locale)} />}
    </>
  );
}
