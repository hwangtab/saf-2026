import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import SectionTitle from '@/components/ui/SectionTitle';
import LinkButton from '@/components/ui/LinkButton';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { SITE_URL } from '@/lib/constants';
import { resolveLocale } from '@/lib/server-locale';
import { Link } from '@/i18n/navigation';

export const revalidate = false;

const PAGE_URL = `${SITE_URL}/about`;
const PAGE_COPY = {
  ko: {
    title: '씨앗페 소개',
    description:
      '씨앗페는 예술인 금융 차별 문제를 해결하기 위한 상호부조 캠페인입니다. 127명의 작가가 연대하여 작품 판매 수익을 예술인 저금리 대출 기금으로 전환합니다.',
    keywords:
      '씨앗페 2026 소개, 예술인 상호부조 전시, 씨앗페 캠페인, 예술인 금융 차별, 씨앗페 온라인 갤러리, 한국 예술인 연대, 씨앗페 소개',
  },
  en: {
    title: 'About SAF',
    description:
      'SAF is a mutual aid campaign tackling financial discrimination against Korean artists. 127 artists unite to convert artwork sales into low-interest loans for fellow artists.',
    keywords:
      'SAF 2026 about, artist mutual aid exhibition, SAF campaign, artist financial exclusion, Korean artist solidarity, SAF online gallery',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations('seo');
  const title = `${copy.title} | ${tSeo('siteTitle')}`;
  const base = createStandardPageMetadata(title, copy.description, PAGE_URL, '/about', locale);
  return {
    ...base,
    keywords: copy.keywords,
    openGraph: {
      ...base.openGraph,
      type: 'website',
    },
  };
}

const CLUSTER_PAGES = {
  ko: [
    {
      href: '/our-reality',
      title: '우리의 현실',
      description:
        '예술인의 84.9%가 1금융권에서 배제되고 48.6%가 고금리에 노출됩니다. 데이터로 확인하는 한국 예술인 금융 차별의 구조적 실태.',
      icon: '📊',
      cta: '현실 보기',
    },
    {
      href: '/our-proof',
      title: '우리의 증명',
      description:
        '누적 354건, 7억 원 이상 지원, 연체율 0%. 씨앗페 상호부조 모델이 실제로 작동한다는 것을 수치로 증명합니다.',
      icon: '✅',
      cta: '성과 확인',
    },
    {
      href: '/transparency',
      title: '운용 보고서',
      description:
        '2022년 12월부터 시작된 예술인 상호부조 대출 운영 현황을 연간 보고서로 투명하게 공개합니다.',
      icon: '📋',
      cta: '보고서 보기',
    },
    {
      href: '/news',
      title: '언론 보도',
      description: '씨앗페와 예술인 금융 차별 문제를 조명한 언론 보도를 모아 소개합니다.',
      icon: '📰',
      cta: '보도 보기',
    },
  ],
  en: [
    {
      href: '/our-reality',
      title: 'Our Reality',
      description:
        '84.9% of Korean artists are excluded from mainstream banking, and 48.6% face predatory lending. Explore the structural data.',
      icon: '📊',
      cta: 'View the data',
    },
    {
      href: '/our-proof',
      title: 'Our Proof',
      description:
        '354 loans, over KRW 700M deployed, 0% default rate. Numbers that prove the SAF mutual aid model works in practice.',
      icon: '✅',
      cta: 'See the results',
    },
    {
      href: '/transparency',
      title: 'Transparency Reports',
      description:
        'Full annual reports on the mutual aid loan program, published openly since December 2022.',
      icon: '📋',
      cta: 'Read reports',
    },
    {
      href: '/news',
      title: 'Press',
      description:
        'Media coverage shining a light on SAF and the issue of financial discrimination against artists.',
      icon: '📰',
      cta: 'View coverage',
    },
  ],
} as const;

const MISSION_COPY = {
  ko: {
    missionLabel: '캠페인 미션',
    missionText:
      '127명의 작가들은 금융 배제를 겪는 동료 예술인을 돕기 위해 자발적으로 작품을 내놓았습니다. 작품 판매 수익은 상호부조 기금으로 전환되어, 금융 차별을 겪는 예술인에게 저금리 대출로 이어집니다.',
    howItWorksTitle: '어떻게 작동하나요?',
    steps: [
      { step: '01', label: '작가 연대', desc: '127명의 작가가 전시 작품을 출품합니다' },
      { step: '02', label: '작품 판매', desc: '온라인 갤러리를 통해 작품이 판매됩니다' },
      { step: '03', label: '기금 적립', desc: '판매 수익이 상호부조 기금으로 전환됩니다' },
      { step: '04', label: '저금리 대출', desc: '금융 차별을 겪는 예술인에게 대출이 이어집니다' },
    ],
    exploreTitle: '더 알아보기',
  },
  en: {
    missionLabel: 'Campaign Mission',
    missionText:
      '127 artists voluntarily contributed their work to support fellow artists facing financial exclusion. Artwork sales flow into a mutual aid fund that extends low-interest loans to artists who face discrimination from the financial system.',
    howItWorksTitle: 'How It Works',
    steps: [
      {
        step: '01',
        label: 'Artist Solidarity',
        desc: '127 artists submit works to the exhibition',
      },
      { step: '02', label: 'Artwork Sales', desc: 'Works are sold through the online gallery' },
      { step: '03', label: 'Fund Building', desc: 'Sales revenue converts to mutual aid fund' },
      {
        step: '04',
        label: 'Low-Interest Loans',
        desc: 'Loans reach artists facing financial exclusion',
      },
    ],
    exploreTitle: 'Explore More',
  },
} as const;

export default async function AboutPage() {
  const locale = resolveLocale(await getLocale());
  const tNav = await getTranslations('nav');
  const pages = CLUSTER_PAGES[locale];
  const copy = MISSION_COPY[locale];
  const pageCopy = PAGE_COPY[locale];

  const breadcrumbItems = [
    { name: locale === 'en' ? 'Home' : '홈', url: '/' },
    { name: pageCopy.title, url: '/about' },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />

      <PageHero
        id="about-hero"
        title={pageCopy.title}
        description={pageCopy.description}
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={PAGE_URL}
          title={pageCopy.title}
          description={pageCopy.description}
        />
      </PageHero>

      {/* 미션 섹션 */}
      <Section variant="white">
        <div className="container-max px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block text-sm font-bold tracking-widest text-primary uppercase mb-4">
              {copy.missionLabel}
            </span>
            <p className="text-lg md:text-xl text-charcoal leading-relaxed text-balance">
              {copy.missionText}
            </p>
          </div>
        </div>
      </Section>

      {/* 흐름 섹션 */}
      <Section variant="canvas-soft">
        <div className="container-max px-4">
          <SectionTitle className="mb-12">{copy.howItWorksTitle}</SectionTitle>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0">
            {copy.steps.map((item) => (
              <li key={item.step} className="flex flex-col items-center text-center">
                <span className="text-4xl font-bold text-primary/30 font-display mb-3">
                  {item.step}
                </span>
                <h3 className="text-base font-bold text-charcoal-deep mb-1">{item.label}</h3>
                <p className="text-sm text-charcoal-muted leading-relaxed">{item.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* 하위 페이지 카드 섹션 */}
      <Section variant="white">
        <div className="container-max px-4">
          <SectionTitle className="mb-12">{copy.exploreTitle}</SectionTitle>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 list-none p-0">
            {pages.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className="group flex flex-col h-full p-8 rounded-xl border border-gray-200 bg-white hover:border-primary hover:shadow-md transition-all duration-200"
                >
                  <span className="text-3xl mb-4" aria-hidden="true">
                    {page.icon}
                  </span>
                  <h2 className="text-xl font-bold text-charcoal-deep mb-2 group-hover:text-primary transition-colors">
                    {page.title}
                  </h2>
                  <p className="text-sm text-charcoal-muted leading-relaxed flex-1">
                    {page.description}
                  </p>
                  <span className="mt-4 text-sm font-semibold text-primary group-hover:underline">
                    {page.cta} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* CTA */}
      <Section variant="primary-soft">
        <div className="container-max px-4 text-center">
          <p className="text-lg font-bold text-charcoal-deep mb-6 text-balance">
            {locale === 'en'
              ? 'Support artists by purchasing their work.'
              : '작품 구매로 예술인 연대에 동참하세요.'}
          </p>
          <LinkButton href="/artworks" variant="primary" size="lg">
            {tNav('allArtworks')}
          </LinkButton>
        </div>
      </Section>
    </>
  );
}
