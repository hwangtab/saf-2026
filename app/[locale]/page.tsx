import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import SafeImage from '@/components/common/SafeImage';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import LinkButton from '@/components/ui/LinkButton';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import ActionCard from '@/components/ui/ActionCard';
import BackgroundSlider from '@/components/features/BackgroundSlider';
import SawtoothDivider from '@/components/ui/SawtoothDivider';
import { EXTERNAL_LINKS, OG_IMAGE, SITE_URL, STATISTICS_DATA } from '@/lib/constants';
import {
  generateExhibitionSchema,
  generateFAQSchema,
  generateCampaignSchema,
} from '@/lib/seo-utils';
import { generateArtworkPurchaseHowTo, generateMemberJoinHowTo } from '@/lib/schemas/howto';
import { generateSAFCoreQA } from '@/lib/schemas/qa-page';
import { getSupabaseHomepageArtworks, getSupabaseFAQs } from '@/lib/supabase-data';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';

export const revalidate = 1800;

const DynamicCounter = dynamic(() => import('@/components/features/DynamicCounter'), {
  loading: () => (
    <div className="w-full h-[180px] rounded-xl bg-canvas animate-pulse" aria-hidden="true" />
  ),
});
const FAQList = dynamic(() => import('@/components/features/FAQList'), {
  loading: () => (
    <div className="w-full h-[280px] rounded-xl bg-white/60 animate-pulse" aria-hidden="true" />
  ),
});
const ArtworkHighlightSlider = dynamic(
  () => import('@/components/features/ArtworkHighlightSlider'),
  {
    loading: () => (
      <Section variant="canvas-soft" className="py-16 md:py-24 overflow-hidden">
        <div
          className="container-max h-[300px] animate-pulse rounded-xl bg-white/70"
          aria-hidden="true"
        />
      </Section>
    ),
  }
);

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const t = await getTranslations('home');
  const pageUrl = buildLocaleUrl('/', locale);

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: createLocaleAlternates('/', locale),
    openGraph: {
      type: 'website',
      siteName: t('metaTitle').split(' - ')[0],
      title: t('metaTitle'),
      description: t('ogDescription'),
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
  const counterItems = STATISTICS_DATA.slice(0, 3);

  const heroTitleLines = t('heroTitle').split('\n');
  const heroDescLines = t('heroDescription').split('\n');

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-12 pb-12 md:pt-20 md:pb-20">
        <div
          data-hero-sentinel="true"
          aria-hidden="true"
          className="absolute top-0 left-0 h-px w-px"
        />
        <BackgroundSlider />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/35 pointer-events-none" />
        <SawtoothDivider position="bottom" colorClass="text-canvas-soft" />
        <div className="relative z-10 container-max text-center">
          <div className="mb-12 translate-y-6 hidden md:flex justify-center">
            <SafeImage
              src="/images/logo/320pxX90px_white.webp"
              alt={t('logoAlt')}
              width={1120}
              height={320}
              className="w-96 md:w-[56rem] h-auto drop-shadow-2xl"
              priority
              placeholder="empty"
            />
          </div>
          <h1
            className="mt-12 md:mt-0 font-display text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight text-white drop-shadow-lg text-balance opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            {heroTitleLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>
          <p
            className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-lg break-keep text-balance opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
          >
            {heroDescLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br className="hidden md:block" />}
                {line}
              </span>
            ))}
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
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
              href="/archive"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border-white/50 text-white hover:bg-white hover:text-primary min-w-[160px] justify-center"
            >
              {t('aboutSaf')}
            </LinkButton>
          </div>

          <div className="flex justify-center">
            <ShareButtonsWrapper
              url={SITE_URL}
              title={t('shareTitle')}
              description={t('shareDescription')}
            />
          </div>
        </div>
      </section>

      <Suspense fallback={<HomeDataSectionsFallback />}>
        <HomeDataSections counterItems={counterItems} />
      </Suspense>

      {/* Call to Action Section (Moved Up) */}
      <Section variant="accent-soft" prevVariant="canvas-soft" className="pb-24">
        <div className="container-max">
          <SectionTitle className="mb-12">{t('joinCta')}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <ActionCard
              href={EXTERNAL_LINKS.JOIN_MEMBER}
              external
              icon="🤝"
              title={t('joinMember')}
              description={t('joinMemberDesc')}
              linkText={t('joinMemberLink')}
            />

            <ActionCard
              href="/artworks"
              icon="🎨"
              title={t('buyArtwork')}
              description={t('buyArtworkDesc')}
              linkText={t('buyArtworkLink')}
            />

            <ActionCard
              href="/archive"
              icon="🏛️"
              title={t('archiveTitle')}
              description={t('archiveDesc')}
              linkText={t('archiveLink')}
            />
          </div>
        </div>
      </Section>

      {/* Problem Section */}
      <Section variant="sun-soft" prevVariant="accent-soft">
        <div className="container-max">
          <SectionTitle className="mb-12">{t('problemTitle')}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <h3 className="text-card-title text-charcoal">{t('problemFinancial')}</h3>
              <p className="text-charcoal-muted leading-relaxed">{t('problemFinancialDesc')}</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-card-title text-charcoal">{t('problemDebt')}</h3>
              <p className="text-charcoal-muted leading-relaxed">{t('problemDebtDesc')}</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-card-title text-charcoal">{t('problemDamage')}</h3>
              <p className="text-charcoal-muted leading-relaxed">{t('problemDamageDesc')}</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-card-title text-charcoal">{t('problemSolution')}</h3>
              <p className="text-charcoal-muted leading-relaxed">
                {t.rich('problemSolutionDesc', {
                  orgLink: (chunks) => (
                    <a
                      href={EXTERNAL_LINKS.KOSMART_HOME}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Solution Section */}
      <Section variant="primary-surface" prevVariant="sun-soft" className="pb-32">
        <div className="container-max">
          <SectionTitle className="mb-12">{t('solutionTitle')}</SectionTitle>
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-3xl mx-auto text-balance text-center md:text-left">
            <div className="mb-8">
              <h3 className="text-card-title text-charcoal mb-4">{t('solutionTrust')}</h3>
              <p className="text-charcoal-muted leading-relaxed mb-4">
                {t.rich('solutionTrustDesc', {
                  orgLink: (chunks) => (
                    <a
                      href={EXTERNAL_LINKS.KOSMART_HOME}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>
            <div className="border-t pt-8">
              <p className="text-charcoal mb-6">{t('solutionProof')}</p>
              <LinkButton
                href={EXTERNAL_LINKS.LOAN_INFO}
                external
                variant="accent"
                size="md"
                className="w-full md:w-auto justify-center"
              >
                {t('applyLoan')}
              </LinkButton>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ Section */}
      <Section variant="sun-soft" prevVariant="primary-surface" className="pb-24 md:pb-32">
        <div className="container-max">
          <SectionTitle className="mb-12">{t('faqTitle')}</SectionTitle>
          <Suspense
            fallback={
              <div
                className="w-full h-[280px] rounded-xl bg-white/60 animate-pulse"
                aria-hidden="true"
              />
            }
          >
            <HomeFAQSection locale={locale} />
          </Suspense>
        </div>
      </Section>

      {/* ExhibitionEvent JSON-LD Schema using Component */}
      <JsonLdScript data={generateExhibitionSchema([], locale)} />
      {/* FundingScheme JSON-LD for campaign Rich Results */}
      <JsonLdScript data={generateCampaignSchema(locale)} />
      {/* AEO/GEO: HowTo + QAPage schemas for AI engine optimization */}
      <JsonLdScript data={generateArtworkPurchaseHowTo(locale)} />
      <JsonLdScript data={generateMemberJoinHowTo(locale)} />
      <JsonLdScript data={generateSAFCoreQA(locale)} />
    </>
  );
}

async function HomeDataSections({ counterItems }: { counterItems: typeof STATISTICS_DATA }) {
  const sliderArtworks = await getSupabaseHomepageArtworks(30);

  return (
    <>
      <ArtworkHighlightSlider artworks={sliderArtworks} />
      <DynamicCounter items={counterItems} />
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

function HomeDataSectionsFallback() {
  return (
    <>
      <Section variant="canvas-soft" className="py-16 md:py-24 overflow-hidden">
        <div
          className="container-max h-[300px] animate-pulse rounded-xl bg-white/70"
          aria-hidden="true"
        />
      </Section>
      <div className="container-max py-8">
        <div className="w-full h-[180px] rounded-xl bg-canvas animate-pulse" aria-hidden="true" />
      </div>
    </>
  );
}
