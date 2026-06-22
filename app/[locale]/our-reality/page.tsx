import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import TestimonialCard from '@/components/ui/TestimonialCard';
import { getHeroOverride } from '@/lib/hero-curation';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import CTAButtonGroup from '@/components/common/CTAButtonGroup';
import { getSupabaseTestimonials } from '@/lib/supabase-data';
import { CONTACT, EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';
import { LOAN_COUNT } from '@/lib/site-stats';
import HighlightedText from '@/components/ui/HighlightedText';
import {
  FirstBankAccessChart,
  RejectionReasonsChart,
  HighInterestProductChart,
  InterestRateDistributionChart,
  DebtCollectionChart,
  CreativeImpactChart,
} from '@/components/features/charts/DynamicCharts';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { Link } from '@/i18n/navigation';
import RelatedStoriesGrid from '@/components/features/RelatedStoriesGrid';
import { AlertTriangle, Ban, Drama, Leaf, Timer } from 'lucide-react';

export const dynamic = 'force-static';
export const revalidate = 3600;

const LAST_UPDATED = '2026-01-15';
const PAGE_URL = `${SITE_URL}/our-reality`;
const PAGE_COPY = {
  ko: {
    // 끝에 "· 씨앗페" 브랜드 추가 — Twitter 카드는 twitter:title만 노출하고 siteName 안 보여줌.
    // 페이스북/카카오는 OG siteName 별도 표시되지만 트위터·LinkedIn 등은 title 단독 → 브랜드 명시 필요.
    title: '한국 예술인 84.9%가 대출에서 배제된다 · 2025 금융 재난 보고서 | 씨앗페',
    description:
      '한국 예술인 84.9%가 제1금융권 대출에서 배제, 48.6%가 연 15% 이상 고금리 상품에 노출, 88.3%가 채권추심 후 창작을 중단한다. 2025 실태조사 데이터로 본 예술인 금융 위기의 구조.',
  },
  en: {
    title: '84.9% of Korean artists are excluded from bank loans · 2025 Report | SAF',
    description:
      '84.9% of Korean artists are shut out of primary banking, 48.6% are pushed to high-interest products (15%+ APR), and 88.3% stop creating after debt collection. Evidence from the 2025 artist finance survey.',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const base = createStandardPageMetadata(
    copy.title,
    copy.description,
    PAGE_URL,
    '/our-reality',
    locale
  );
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'article',
    },
    other: {
      'article:published_time': '2026-01-14',
      'article:modified_time': LAST_UPDATED,
      'article:section': locale === 'en' ? 'Data & Research' : '데이터 & 연구',
      'article:author': locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
  };
}

export default async function OurReality({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl('/our-reality', locale);
  const testimonialsData = await getSupabaseTestimonials();
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('ourReality'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const aboutPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name:
      locale === 'en'
        ? 'Our Reality — Artist Financial Exclusion in Korea'
        : '우리의 현실 — 한국 예술인 금융 배제',
    isPartOf: { '@id': `${SITE_URL}#website` },
    // 주제 Thing + finance/social hub CreativeWork — Sprint 29~40 entity 시그널 정책 일관 적용.
    about: [
      {
        '@type': 'Thing' as const,
        name: locale === 'en' ? 'Artist Financial Exclusion in Korea' : '한국 예술인 금융 배제',
      },
      ...(
        [
          ['how-mutual-aid-fund-works', '상호부조 기금 작동 원리', 'How the Mutual Aid Fund Works'],
          ['artist-finance-5-numbers', '예술인 금융 5개 숫자', 'Five Numbers on Artist Finance'],
          [
            'what-is-an-artist-profession',
            '예술인이라는 직업의 진실',
            'The Truth About Being an Artist',
          ],
          [
            'bank-vs-mutual-aid-comparison',
            '은행 vs 상호부조 비교',
            'Bank vs Mutual Aid Comparison',
          ],
          ['global-artist-finance', '해외 예술인 금융 지원 사례', 'Global Artist Finance Support'],
        ] as const
      ).map(([slug, koName, enName]) => ({
        '@type': 'CreativeWork' as const,
        '@id': `${SITE_URL}/stories/${slug}#about`,
        url: `${SITE_URL}/stories/${slug}`,
        name: locale === 'en' ? enName : koName,
      })),
    ],
    datePublished: '2026-01-14',
    dateModified: LAST_UPDATED,
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    author: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#stage1-description', '#stage2-description', '#stage3-description'],
    },
  };
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${pageUrl}#dataset`,
    name:
      locale === 'en'
        ? 'Korean Artist Financial Exclusion Statistics 2025'
        : '2025 한국 예술인 금융 배제 통계',
    description:
      locale === 'en'
        ? '2025 survey data on financial exclusion of Korean artists: first-tier bank rejection rates, high-interest loan usage, and impact on creative work.'
        : '2025년 한국 예술인 금융 배제 실태 데이터: 제1금융권 배제율, 고금리 대출 현황, 창작 활동 영향 등 통계.',
    url: pageUrl,
    datePublished: '2026-01-14',
    dateModified: LAST_UPDATED,
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    creator: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'text/html',
      contentUrl: pageUrl,
    },
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: locale === 'en' ? 'First-tier bank exclusion rate' : '제1금융권 배제율',
        value: '84.9',
        unitText: '%',
      },
      {
        '@type': 'PropertyValue',
        name: locale === 'en' ? 'High-interest product usage rate' : '고금리 상품 이용률',
        value: '48.6',
        unitText: '%',
      },
      {
        '@type': 'PropertyValue',
        name: locale === 'en' ? 'Creative activity impact rate' : '창작 활동 영향률',
        value: '71.3',
        unitText: '%',
      },
    ],
    // schema.org Dataset.isPartOf는 Dataset 또는 DataCatalog만 허용. WebSite를 가리키면
    // GSC가 "isPartOf 입력란의 개체 유형이 잘못되었습니다"로 보고함(2026-04-23~). 이 통계는
    // 더 큰 데이터 컬렉션의 일부가 아니므로 isPartOf 자체를 제거하는 게 정답. AboutPage의
    // isPartOf(WebSite)는 schema.org 사양상 정상이므로 위 aboutPageSchema는 그대로 유지.

    // license — Google Dataset 가이드라인 권장 속성. GSC가 "license 입력란이 누락" 보고
    // (2026-05-07). CC-BY 4.0 선언: 출처 표시만 요구하는 자유 라이선스로, 우리 캠페인
    // 메시지(예술인 금융 차별의 사회적 가시화)가 학술·언론·블로그 등에서 널리 인용되는 게
    // 운동 목적에 부합. 통계 자체는 한국스마트협동조합 자체 조사 + 공개 인용.
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  return (
    <>
      <JsonLdScript data={[breadcrumbSchema, aboutPageSchema, datasetSchema]} />
      <PageHero
        customBackgroundImage={getHeroOverride('our-reality')}
        title={isEnglish ? 'Our Reality' : '우리의 현실'}
        description={
          isEnglish
            ? 'Data from the 2025 report exposes the structural financial exclusion faced by artists in Korea.'
            : '2025 예술인 금융 재난 보고서가 드러낸 한국 예술인 금융 위기의 구조'
        }
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={pageUrl}
          title={isEnglish ? 'Our Reality — SAF Online' : '우리의 현실 - 씨앗페 온라인'}
          description={
            isEnglish
              ? 'Understand the structure of artist financial exclusion through data.'
              : '예술인이 겪는 금융 재난의 구조와 데이터를 확인하세요.'
          }
        />
      </PageHero>

      <div className="w-full bg-white">
        <div className="container-max pt-4 text-right">
          <p className="text-xs text-charcoal-soft">
            {isEnglish ? 'Last updated' : '마지막 업데이트'}: {LAST_UPDATED}
          </p>
        </div>
      </div>
      {testimonialsData.map((group, groupIndex) => {
        const variants: ('white' | 'gray' | 'canvas-soft')[] = ['white', 'gray', 'canvas-soft'];
        const currentVariant = variants[groupIndex % variants.length];
        const prevVariant =
          groupIndex > 0 ? variants[(groupIndex - 1) % variants.length] : undefined;
        const groupCategory =
          isEnglish && group.category_en?.trim() ? group.category_en : group.category;

        return (
          <Section key={group.category} variant={currentVariant} prevVariant={prevVariant}>
            <div className="container-max">
              <SectionTitle className="mb-12">{groupCategory}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {group.items.map((item, itemIndex) => {
                  const itemQuote = isEnglish && item.quote_en?.trim() ? item.quote_en : item.quote;
                  const itemAuthor =
                    isEnglish && item.author_en?.trim() ? item.author_en : item.author;
                  const itemContext =
                    isEnglish && item.context_en?.trim() ? item.context_en : item.context;
                  return (
                    <div
                      key={`${item.author}-${itemIndex}`}
                      className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-primary flex flex-col justify-between"
                    >
                      <p className="text-xl md:text-2xl text-charcoal mb-4 italic leading-relaxed before:content-['“'] after:content-['”']">
                        <HighlightedText text={itemQuote} />
                      </p>
                      <div>
                        <p className="font-semibold text-primary-strong">{itemAuthor}</p>
                        {itemContext && (
                          <p className="text-sm text-charcoal-muted">{itemContext}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        );
      })}

      {/* 회복의 길 — /our-proof에서 이전 (매뉴얼 4.6 A1.5). 고통 증언 → 회복 사례 흐름으로
          매뉴얼 8.5 6단 구조의 "354건의 길" 영역. */}
      <Section variant="white" prevVariant="canvas-soft">
        <div className="container-max">
          <SectionTitle className="mb-4">
            {isEnglish ? 'Paths of Recovery' : '회복의 길'}
          </SectionTitle>
          <p className="text-charcoal-muted mb-12 max-w-3xl">
            {isEnglish
              ? 'The same artists, after the mutual-aid lending program — recovery in their own words.'
              : '같은 예술인들이, 상호부조 대출을 만난 이후 — 회복의 목소리.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {isEnglish ? (
              <>
                <TestimonialCard
                  quote="When I urgently needed hospital expenses, mutual-aid lending let me focus on recovery instead of debt pressure."
                  author="Kim"
                  context="Visual Artist"
                  borderColor="border-primary"
                  contextColor="text-primary-strong"
                />
                <TestimonialCard
                  quote="I had been denied at every bank. Here, I was recognized as an artist with a viable future."
                  author="Lee"
                  context="Independent Film Director"
                  borderColor="border-charcoal-deep"
                  contextColor="text-charcoal-deep"
                />
                <TestimonialCard
                  quote="The program enabled my exhibition preparation when production costs were impossible to cover."
                  author="Park"
                  context="Installation Artist"
                  borderColor="border-primary"
                  contextColor="text-primary-strong"
                />
                <TestimonialCard
                  quote="Knowing my repayments can support another artist makes me even more responsible."
                  author="Choi"
                  context="Musical Actor"
                  borderColor="border-primary-strong"
                  contextColor="text-primary-strong"
                />
              </>
            ) : (
              <>
                <TestimonialCard
                  quote="급하게 병원비가 필요했는데, 어디서도 돈을 빌릴 수 없었어요. 상호부조 대출 덕분에 치료에만 집중할 수 있었습니다."
                  author="김OO"
                  context="시각 예술가"
                  borderColor="border-primary"
                  contextColor="text-primary-strong"
                />
                <TestimonialCard
                  quote="은행 문턱이 너무 높았는데, 여기서는 저를 '예술인'으로 인정해주더군요. 단순한 대출이 아니라 큰 위로와 응원이었습니다."
                  author="이OO"
                  context="독립 영화감독"
                  borderColor="border-charcoal-deep"
                  contextColor="text-charcoal-deep"
                />
                <TestimonialCard
                  quote="다음 전시 준비 자금이 막막했는데, 덕분에 무사히 작품을 완성하고 전시를 열 수 있었습니다. 이 제도가 없었다면 불가능했을 거예요."
                  author="박OO"
                  context="설치 미술가"
                  borderColor="border-primary"
                  contextColor="text-primary-strong"
                />
                <TestimonialCard
                  quote="내 상환금이 다른 동료 예술가에게 희망이 된다는 사실이 저를 더 책임감 있게 만듭니다. 우리는 서로의 안전망입니다."
                  author="최OO"
                  context="뮤지컬 배우"
                  borderColor="border-primary-strong"
                  contextColor="text-primary-strong"
                />
              </>
            )}
          </div>
        </div>
      </Section>

      {/* 도입: 금융의 재정의 */}
      <Section variant="white" prevVariant="white">
        <div className="container-max">
          <div className="max-w-3xl mx-auto text-balance">
            <SectionTitle className="mb-8">
              {isEnglish
                ? 'For artists, finance is a life-support system'
                : '예술인에게 금융은 산소호흡기'}
            </SectionTitle>
            <div className="space-y-6 text-lg text-charcoal">
              {isEnglish ? (
                <>
                  <p>
                    Artists earn project-based, irregular income — not steady payroll. Between one
                    performance and the next, between one exhibition and the next, comes an
                    unavoidable <strong>&ldquo;income gap&rdquo;</strong> built into the structure
                    of creative work.
                  </p>
                  <p>
                    During those gaps, rent, food, and materials still have to be paid. Stable
                    finance is not just &lsquo;debt&rsquo; — it is
                    <strong>
                      {' '}
                      the <span className="text-charcoal-deep">oxygen</span> that keeps creative
                      time alive
                    </strong>
                    .
                  </p>
                  <p>
                    Yet Korea&rsquo;s financial system has never recognized artists as legitimate
                    customers. The result is a closed loop of
                    <strong> exclusion → predatory lending → collapse</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    예술인들은 정기적인 급여가 아닌, 프로젝트 기반의 불규칙한 소득을 얻습니다.
                    공연과 공연 사이, 전시와 전시 사이 발생하는
                    <strong> &ldquo;소득 공백기&rdquo;</strong>는 그들이 피할 수 없는 구조적
                    현실입니다.
                  </p>
                  <p>
                    이 공백기 동안 월세, 식비, 창작 재료비를 버텨낼 방법이 필요합니다. 안정적인
                    금융은 단순한 &lsquo;빚&rsquo;이 아닌,
                    <strong>
                      {' '}
                      창작의 시간을 살려내는 <span className="text-charcoal-deep">생명의 산소</span>
                    </strong>
                    입니다.
                  </p>
                  <p>
                    그러나 한국의 금융 시스템은 예술인을 정상적인 금융 고객으로 인정하지 않았습니다.
                    그 결과 예술인들은
                    <strong> 배제 → 약탈 → 파괴</strong>라는 악순환에 갇혀있습니다.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Stage 1: 배제 (84.9%) */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <div className="mb-12">
            <Ban aria-hidden="true" className="mb-4 h-12 w-12 text-primary-strong" />
            <span className="text-sm font-bold text-primary-strong uppercase">
              {isEnglish ? 'STRUCTURE 1' : '구조 1'}
            </span>
            <SectionTitle className="mb-4">
              {isEnglish
                ? 'Access gap: artists outside mainstream banking'
                : '접근의 격차: 제도권 금융과 예술인'}
            </SectionTitle>
            <p className="text-xl text-charcoal-muted max-w-2xl leading-relaxed">
              {isEnglish ? (
                <>
                  Primary banking exclusion rate <strong className="text-sun-strong">84.9%</strong>
                </>
              ) : (
                <>
                  제1금융권 배제율 <strong className="text-sun-strong">84.9%</strong>
                </>
              )}
            </p>
          </div>

          {/* Description Text */}
          <div id="stage1-description" className="max-w-3xl mb-12">
            <h3 className="text-card-title mb-3">
              {isEnglish ? 'Why are the bank doors shut?' : '은행의 문은 왜 닫혔나?'}
            </h3>
            <ul className="space-y-3 text-charcoal">
              <li className="flex gap-3">
                <span className="font-bold text-primary-strong">•</span>
                <span>
                  {isEnglish ? (
                    <>
                      <strong>53.1%</strong> were <strong>directly rejected</strong> after applying
                      for a loan
                    </>
                  ) : (
                    <>
                      <strong>53.1%</strong>는 대출 신청 후 직접적으로 <strong>거절</strong>
                    </>
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary-strong">•</span>
                <span>
                  {isEnglish ? (
                    <>
                      <strong>31.8%</strong> <strong>never applied</strong>, expecting to be
                      rejected
                    </>
                  ) : (
                    <>
                      <strong>31.8%</strong>는 어차피 안 될 것이라 예상하며{' '}
                      <strong>신청 포기</strong>
                    </>
                  )}
                </span>
              </li>
            </ul>
          </div>

          {/* Chart Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div className="h-[420px] md:h-96">
              <RejectionReasonsChart />
            </div>
            <div className="h-[420px] md:h-96">
              <FirstBankAccessChart />
            </div>
          </div>
        </div>
      </Section>

      {/* Stage 2: 약탈 (48.6%) */}
      <Section variant="primary-surface" prevVariant="primary-surface">
        <div className="container-max">
          <div className="mb-12">
            <AlertTriangle aria-hidden="true" className="mb-4 h-12 w-12 text-primary-strong" />
            <span className="text-sm font-bold text-primary-strong uppercase">
              {isEnglish ? 'STRUCTURE 2' : '구조 2'}
            </span>
            <SectionTitle className="mb-4">
              {isEnglish
                ? 'High-interest reliance: a structural detour'
                : '고금리 의존: 구조가 만든 우회로'}
            </SectionTitle>
            <p className="text-xl text-charcoal-muted max-w-2xl leading-relaxed">
              {isEnglish ? (
                <>
                  Predatory product exposure <strong className="text-sun-strong">48.6%</strong>{' '}
                  (15%+ APR)
                </>
              ) : (
                <>
                  고리대금 상품 노출률 <strong className="text-sun-strong">48.6%</strong> (연 15%
                  이상)
                </>
              )}
            </p>
          </div>

          {/* Description Text */}
          <div id="stage2-description" className="max-w-3xl mb-12">
            <h3 className="text-card-title mb-3">
              {isEnglish ? 'Not a choice — survival' : '선택이 아닌 생존'}
            </h3>
            {isEnglish ? (
              <>
                <p className="text-charcoal mb-4 text-balance leading-relaxed">
                  The moment the bank door closes, artists are funneled straight into savings banks,
                  card loans, and consumer finance lenders.
                  <strong> 83.2% of artists have used a high-interest financial product</strong>.
                </p>
                <p className="text-charcoal leading-relaxed">
                  This is not a preference — it is the only exit available for survival.
                </p>
              </>
            ) : (
              <>
                <p className="text-charcoal mb-4 text-balance leading-relaxed">
                  은행 문이 닫힌 순간, 예술인들은 곧바로 저축은행, 카드론, 대부업체로 내몰립니다.
                  <strong> 83.2%의 예술인이 고리대금 금융 상품을 이용</strong>한 경험이 있습니다.
                </p>
                <p className="text-charcoal leading-relaxed">
                  이는 선택이 아닌, 생존을 위한 유일한 탈출구였습니다.
                </p>
              </>
            )}
          </div>

          {/* Chart Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div className="h-[420px] md:h-96">
              <InterestRateDistributionChart />
            </div>
            <div className="h-[420px] md:h-96">
              <HighInterestProductChart />
            </div>
          </div>
        </div>
      </Section>

      {/* Stage 3: 파괴 (88.3%) */}
      <Section variant="red" prevVariant="primary-surface">
        <div className="container-max">
          <div className="mb-12">
            <div className="text-5xl mb-4" aria-hidden="true">
              💔
            </div>
            <span className="text-sm font-bold text-danger uppercase">
              {isEnglish ? 'STRUCTURE 3' : '구조 3'}
            </span>
            <SectionTitle className="mb-4">
              {isEnglish
                ? 'Creative-time disruption: a chain effect'
                : '창작 시간의 단절: 연쇄 효과'}
            </SectionTitle>
            <p className="text-xl text-charcoal-muted max-w-2xl leading-relaxed">
              {isEnglish ? (
                <>
                  Creative-stoppage rate among debt-collection survivors{' '}
                  <strong className="text-sun-strong">88.3%</strong>
                </>
              ) : (
                <>
                  채권추심 경험자의 창작 중단율 <strong className="text-sun-strong">88.3%</strong>
                </>
              )}
            </p>
          </div>

          {/* Description Text */}
          <div id="stage3-description" className="max-w-3xl mb-12">
            <h3 className="text-card-title mb-3">
              {isEnglish ? 'A crisis of survival' : '생존의 위기'}
            </h3>
            <p className="text-charcoal mb-4 text-balance leading-relaxed">
              {isEnglish ? (
                <>
                  <strong>4 out of 10 (43%)</strong> Korean artists have lived through debt
                  collection — relentless phone calls, verbal abuse, agents at the front door. Many
                  are pushed to the edge of survival itself.
                </>
              ) : (
                <>
                  채권추심을 경험한 예술인은 <strong>10명 중 4명(43%)</strong>입니다. 이들은 멈추지
                  않는 전화, 모욕적인 언사, 집으로 찾아오는 추심원 앞에서 생존의 벼랑 끝으로
                  내몰립니다.
                </>
              )}
            </p>
          </div>

          {/* Chart Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div className="h-[420px] md:h-96">
              <CreativeImpactChart />
            </div>
            <div className="h-[420px] md:h-96">
              <DebtCollectionChart />
            </div>
          </div>
        </div>
      </Section>

      {/* 진단: 사회적 재난 */}
      <Section variant="white" prevVariant="red">
        <div className="container-max max-w-3xl">
          <SectionTitle className="mb-8">
            {isEnglish
              ? 'This is a structural gap, not a personal one'
              : '개인의 문제가 아닌, 구조의 문제'}
          </SectionTitle>
          <div className="space-y-6 text-lg text-charcoal">
            {isEnglish ? (
              <>
                <p>
                  Artist financial hardship is not the result of laziness or carelessness. It is a{' '}
                  <strong>structural failure of a financial system</strong> that refuses to
                  recognize project-based labor as legitimate work.
                </p>
                <p>
                  Employment insurance, unemployment benefits, and most social safety nets in Korea
                  are designed around &lsquo;permanent employment.&rsquo; Artists are{' '}
                  <strong>systematically excluded</strong> from both finance and social protection.
                </p>
                <p>
                  This is not an individual poverty problem. It is{' '}
                  <strong>
                    a social disaster threatening the sustainability of Korea&rsquo;s cultural
                    ecosystem
                  </strong>
                  .
                </p>
                <p>
                  As a structural alternative, SAF runs an{' '}
                  <Link
                    href="/our-proof"
                    className="text-primary-strong hover:underline font-medium"
                  >
                    artist mutual-aid lending program
                  </Link>{' '}
                  and proves its results through data. When you{' '}
                  <Link
                    href="/artworks"
                    className="text-primary-strong hover:underline font-medium"
                  >
                    purchase a participating artist&rsquo;s work
                  </Link>
                  , the proceeds become a mutual-aid fund that opens low-interest loans for fellow
                  artists.
                </p>
              </>
            ) : (
              <>
                <p>
                  예술인 금융 위기는 개인의 나태나 불성실의 결과가 아닙니다. 이는{' '}
                  <strong>프로젝트 기반 고용이라는 산업 구조</strong>를 전혀 인정하지 않는 금융
                  시스템의 구조적 실패입니다.
                </p>
                <p>
                  고용보험, 실업급여 등 대부분의 사회 안전망도 전통적 &lsquo;상시 고용&rsquo;을
                  기준으로 설계되어 예술인들은{' '}
                  <strong>사회적으로도 금융적으로도 체계적으로 배제</strong>되어 있습니다.
                </p>
                <p>
                  이것은 단순한 개인의 빈곤 문제가 아니라
                  <strong> 한국 문화예술 생태계의 지속가능성을 위협하는 사회적 재난</strong>입니다.
                </p>
                <p>
                  씨앗페는 이 구조적 문제의 대안으로{' '}
                  <Link
                    href="/our-proof"
                    className="text-primary-strong hover:underline font-medium"
                  >
                    예술인 상호부조 대출
                  </Link>
                  을 실행하고 있고 데이터로 그 성과를 확인하고 있습니다.{' '}
                  <Link
                    href="/artworks"
                    className="text-primary-strong hover:underline font-medium"
                  >
                    출품 작가들의 작품을 구매
                  </Link>
                  하면 판매 수익이 예술인 상호부조 기금이 되어 다음 작가의 저금리 대출로 이어집니다.
                </p>
              </>
            )}
          </div>
        </div>
      </Section>

      {/* 관련 매거진 — 예술인 금융 현실 심화 읽기 */}
      <RelatedStoriesGrid
        locale={locale}
        eyebrow={{ ko: '데이터 더 읽기', en: 'Read the Data' }}
        title={{ ko: '숫자 뒤의 이야기', en: 'The Stories Behind the Numbers' }}
        slugs={['artist-finance-5-numbers', 'why-banks-reject-artists', 'testimonials-narrative']}
      />

      {/* 제언: 산소호흡기가 필요하다 */}
      <Section variant="canvas" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-8">
            {isEnglish ? 'What artists need is oxygen' : '산소호흡기가 필요하다'}
          </SectionTitle>
          <div className="space-y-6 text-lg text-charcoal mb-12 max-w-3xl mx-auto text-balance">
            {isEnglish ? (
              <>
                <p>
                  Artists do not need a one-time grant or welfare program.
                  <strong>
                    {' '}
                    They need stable finance that can absorb the unpredictable gaps
                  </strong>{' '}
                  between projects.
                </p>
                <p>
                  If welfare is giving someone a fish, finance is the <strong>oxygen</strong> that
                  keeps them alive long enough to fish again.
                </p>
              </>
            ) : (
              <>
                <p>
                  예술인에게 필요한 것은 일시적인 지원금이나 복지가 아닙니다.
                  <strong> 예측 불가능한 소득 공백기를 버텨낼 안정적인 금융</strong>입니다.
                </p>
                <p>
                  복지가 물고기를 주는 일이라면 금융은 물고기를 잡으러 나갈 다음 기회까지 버틸 수
                  있게 해주는 <strong>산소호흡기</strong>입니다.
                </p>
              </>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-primary">
              <Timer aria-hidden="true" className="mb-3 h-10 w-10 text-primary-strong" />
              <h3 className="font-bold text-lg mb-2">
                {isEnglish ? 'Save creative time' : '창작 시간을 살려내고'}
              </h3>
              <p className="text-sm text-charcoal-muted">
                {isEnglish
                  ? 'Stable finance carries artists through income gaps so they can stay focused on the work.'
                  : '안정적인 금융으로 소득 공백기를 버티고 창작에 집중할 수 있습니다'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-primary">
              <Drama aria-hidden="true" className="mb-3 h-10 w-10 text-primary-strong" />
              <h3 className="font-bold text-lg mb-2">
                {isEnglish ? 'Protect artistic dignity' : '예술적 존엄성을 지키며'}
              </h3>
              <p className="text-sm text-charcoal-muted">
                {isEnglish
                  ? 'Artists can refuse unfair terms and protect the integrity of their own work.'
                  : '부당한 조건을 거부하고 자신의 예술적 가치를 지킬 수 있습니다'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-primary">
              <Leaf aria-hidden="true" className="mb-3 h-10 w-10 text-primary-strong" />
              <h3 className="font-bold text-lg mb-2">
                {isEnglish ? 'Sustain the ecosystem' : '생태계를 지속가능하게'}
              </h3>
              <p className="text-sm text-charcoal-muted">
                {isEnglish
                  ? 'A diverse, sustainable cultural ecosystem becomes possible — and stays that way.'
                  : '문화예술 생태계의 다양성과 지속가능성을 지킬 수 있습니다'}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Call to Action */}
      <Section variant="primary-surface" prevVariant="canvas" className="pb-24 md:pb-32">
        <div className="container-max text-center">
          <SectionTitle className="mb-6">
            {isEnglish ? 'Now is the time to act' : '이제 행동할 시간입니다'}
          </SectionTitle>
          <p className="text-lg text-charcoal-muted mb-8 max-w-2xl mx-auto text-balance break-keep">
            {isEnglish ? (
              <>
                Help save the creative time of Korean artists.
                <br />
                Membership and artwork purchases become the{' '}
                <span className="text-charcoal-deep font-semibold">oxygen</span> that keeps art
                breathing.
              </>
            ) : (
              <>
                한국 예술인들의 창작 시간을 살려내는 일에 함께해 주세요.
                <br />
                조합원 가입과 작품 구매가 예술이 계속 숨 쉬게 하는{' '}
                <span className="text-charcoal-deep font-semibold">산소호흡기</span>가 됩니다.
              </>
            )}
          </p>
          <CTAButtonGroup
            variant="large"
            className="justify-center"
            trackingPosition="our-reality"
          />

          {/* AI/GEO Optimization: Explicit Citations Section */}
          <div
            id="citations-section"
            className="mt-16 pt-16 border-t border-primary/20 max-w-2xl mx-auto text-left"
          >
            <h3 className="text-sm font-bold text-primary-strong uppercase tracking-widest mb-6">
              {isEnglish ? 'Sources & Citations' : '자료 출처 및 근거 (Citations)'}
            </h3>
            <ul className="space-y-3 text-xs md:text-sm text-charcoal-muted list-disc pl-5">
              {isEnglish ? (
                <>
                  <li>
                    <strong>Financial exclusion and predatory lending statistics</strong>: Korea
                    Smart Cooperative, &lsquo;2025 Artist Financial Disaster Report&rsquo; (in-depth
                    survey of 179 artists).
                  </li>
                  <li>
                    <strong>Repayment data</strong>: Operating records of the artist mutual-aid loan
                    program, December 2022 – September 2025 (cumulative {LOAN_COUNT} loans).
                  </li>
                  <li>
                    <strong>Press coverage</strong>: Hankyoreh (2025-11-05), News Art (2025-11-05),
                    Asia Economy (2025-11-05), and other major daily and specialist outlets.
                  </li>
                  <li>
                    <strong>Institutional context</strong>: Korea Ministry of Culture, Sports and
                    Tourism artist welfare policy and primary banking credit rules for artists.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <strong>금융 배제 및 고리대금 통계</strong>: 한국스마트협동조합 &apos;2025
                    예술인 금융 재난 보고서&apos; (179명 심층 설문 결과)
                  </li>
                  <li>
                    <strong>상환율 데이터</strong>: 2022년 12월~2025년 9월 예술인 상호부조 대출 운용
                    기록 (누적 {LOAN_COUNT}건 집계)
                  </li>
                  <li>
                    <strong>관련 보도</strong>: 한겨레(2025.11.05), 뉴스아트(2025.11.05),
                    아시아경제(2025.11.05) 등 주요 일간지 및 전문지
                  </li>
                  <li>
                    <strong>제도적 배경</strong>: 문화체육관광부 예술인 복지 정책 및 제1금융권
                    예술인 신용 규제 현황
                  </li>
                </>
              )}
            </ul>
          </div>

          <p className="text-sm text-charcoal-muted mt-12">
            {isEnglish
              ? 'Based on the 2025 Artist Financial Disaster Report'
              : '2025 예술인 금융 재난 보고서 기반'}{' '}
            |{' '}
            <a
              href={EXTERNAL_LINKS.KOSMART_HOME}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {isEnglish ? 'Korea Smart Cooperative' : '한국스마트협동조합'}
            </a>
          </p>
        </div>
      </Section>
    </>
  );
}
