import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import nextDynamic from 'next/dynamic';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import MechanismSection from '@/components/features/MechanismSection';
import HomeHero from '@/components/features/HomeHero';
import AboutIdentity from '@/components/features/AboutIdentity';
import NowShowing from '@/components/features/NowShowing';
import MasterArtists from '@/components/features/MasterArtists';
import EntryLevelArtworks from '@/components/features/EntryLevelArtworks';
import EmergingArtists from '@/components/features/EmergingArtists';
import JoinCommunityCTA from '@/components/features/JoinCommunityCTA';
import MagazineSection from '@/components/features/MagazineSection';
import ArtworkCategoryGrid from '@/components/features/ArtworkCategoryGrid';
import { OG_IMAGE, SITE_URL, CONTACT } from '@/lib/constants';
import { LOAN_COUNT } from '@/lib/site-stats';
import { getLiveStats } from '@/lib/live-stats';
import {
  generateExhibitionSchema,
  generateCampaignSchema,
  createBreadcrumbSchema,
} from '@/lib/seo-utils';
import { generateMechanismHowTo } from '@/lib/schemas/howto';
import { getSupabaseArtworksByCategories, getSupabaseFAQs } from '@/lib/supabase-data';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { getMediumHubSlug } from '@/lib/artwork-medium-hub';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import type { Artwork } from '@/types';

// 홈 ISR — 1시간. 작품/FAQ 데이터는 자주 바뀌지 않으므로 cache hit률을 높여
// 백그라운드 regeneration 빈도를 줄임. PSI "서버 응답 속도" 항목 완화 (1047ms TTFB).
// force-static + setRequestLocale: 명시적으로 빌드 시점 prerender + 1시간마다 background
// regeneration. Next.js 16 자동 inference는 보수적이라 explicit 필요.
export const dynamic = 'force-static';
export const revalidate = 3600;

const FAQList = nextDynamic(() => import('@/components/features/FAQList'));

type LocaleParams = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const pageUrl = buildLocaleUrl('/', locale);
  const { artistCount, artworkCount } = await getLiveStats();

  const counts = {
    artistCount,
    artworkCount,
    loanCount: LOAN_COUNT,
  };

  return {
    title: t('metaTitle', counts),
    description: t('metaDescription', counts),
    keywords:
      locale === 'en'
        ? 'SAF2026, saf2026, Seed Art Festival 2026, SAF Online, Korean contemporary art, original artworks for sale, art gallery, artist mutual aid, paintings, prints, sculpture, photography'
        : '한국 현대미술, 작품 구매, 미술 작품 판매, 씨앗페, 씨앗페 온라인, 예술인 상호부조, 회화, 판화, 조각, 사진',
    alternates: createLocaleAlternates('/', locale),
    openGraph: {
      type: 'website',
      siteName: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
      title: t('metaTitle', counts),
      description: t('ogDescription', counts),
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      url: pageUrl,
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: locale === 'en' ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaTitle', counts),
      description: t('twitterDescription', counts),
      images: [{ url: OG_IMAGE.url, alt: locale === 'en' ? OG_IMAGE.altEn : OG_IMAGE.alt }],
    },
  };
}

export default async function Home({ params }: { params: Promise<LocaleParams> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });

  const { artistCount, artworkCount } = await getLiveStats();
  // ICU 변수 한 번에 — 토큰에 없는 키는 next-intl이 무시.
  // React.cache로 generateMetadata와 같은 Supabase fetch 결과 공유(중복 없음).
  const counts = {
    artistCount,
    artworkCount,
    loanCount: LOAN_COUNT,
  };

  return (
    <>
      {/* Hero — 단일 정적 LCP 이미지 + 캠페인 메시지 (HeroSpotlight 폐기 후속, 회귀 trauma 회피).
          carousel 자체를 fold-below `<NowShowing />` 그리드로 이동해 LCP element를 정적 hero와 분리.
          상세 설계 의도: components/features/HomeHero.tsx 헤더 주석 + 메모리
          feedback_hero_server_island_regression.md. */}
      <HomeHero locale={locale} />

      {/* About 정체성 ribbon — 매뉴얼 6.4 [C].
          Hero[B] 직후 30초 인지 영역 — "한국 작가 N명, 작품 N점 / 예술인 상호부조 플랫폼".
          1단 첫 구매자에게 "미술 플랫폼" 인상 우선, 상호부조 보조 톤 (매뉴얼 톤 원칙). */}
      <AboutIdentity locale={locale} />

      {/* 매뉴얼 6.4 [F] + 8.4 사회금융 메커니즘 — 4단계 도식 + 라이브 카운터 + /our-proof 링크.
          challenger 카피 재작업(A-3): 메커니즘을 fold 위로 상향. */}
      <MechanismSection locale={locale} />

      {/* Now Showing 그리드 — fold-below 시한성 큐레이션 카드. hero에 노출된 동일 슬라이드도 카드로
          한 번 더 노출(매거진 톤). 정적 SSR, hydration 0. */}
      <NowShowing locale={locale} />

      {/* 한국 현대미술의 거장 — 매뉴얼 6.4 [E] + 9.2 컬렉션 2.
          시한성 NowShowing[D] 직후 영구 거장 라인업 [E]. 페르소나 B "왜 이 사이트인가" 첫 인지 자산. */}
      <MasterArtists locale={locale} />

      {/* 30만원 이하 첫 그림 — 매뉴얼 6.4 [H] + 9.2 컬렉션 4.
          페르소나 A·1단 첫 구매자 진입 동선. 가격 ₩100,000~₩300,000 + 작가 단위 dedupe + sold/reserved 제외. */}
      <EntryLevelArtworks locale={locale} />

      {/* Category Artwork Sections — 직접 await로 SSR. 이전 Suspense fallback(60vh)
          → 실제 콘텐츠(약 350vh) 전환 시 290vh layout shift → CLS 1.0 → GSC 100% URL
          CLS 회귀 회복. ISR 캐시(revalidate=3600)라 서버 응답 빠르니 streaming 이득보다
          정적 SSR이 CWV에 유리. */}
      <CategorySections locale={locale} />

      {/* 신진 작가 발견 — 매뉴얼 6.4 [G] + 9.2 컬렉션 3.
          페르소나 B "내가 먼저 발견" 자긍심 자극. 거장 6명 제외 + 작가별 1점 dedupe + sold/reserved 제외. */}
      <EmergingArtists locale={locale} />

      {/* 매거진 [K] — 매뉴얼 6.4 [K]. 최신 기사 3건. 깊이감 + 재방문 의지 형성. */}
      <MagazineSection locale={locale} />

      {/* 회원 가입 CTA [L] — 매뉴얼 6.4 [L].
          Impact Stats 제거 후 메인에서 회원 가입 동선이 Footer만 남았던 회귀 보강.
          작품 구매 외 더 깊이 함께하는 보조 동선, 절제된 톤. */}
      <JoinCommunityCTA locale={locale} />

      {/* FAQ — 직전이 JoinCommunityCTA variant="canvas-soft". */}
      <Section variant="canvas" prevVariant="canvas-soft" className="pb-24 md:pb-32">
        <div className="container-max">
          <SectionTitle className="mb-12">{t('faqTitle')}</SectionTitle>
          {/* FAQ도 동일 — Suspense fallback(30vh) → real content 변동으로 CLS 누적.
              직접 await로 정적 렌더 (FAQ 데이터도 ISR 캐시되어 fast). */}
          <HomeFAQSection locale={locale} />
        </div>
      </Section>

      {/* JSON-LD schemas */}
      <JsonLdScript
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': `${buildLocaleUrl('/', locale)}#webpage`,
          url: buildLocaleUrl('/', locale),
          name: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
          isPartOf: { '@id': `${SITE_URL}#website` },
          inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
          datePublished: '2026-01-26',
          dateModified: '2026-03-15',
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
          // 매체 hub about entity — Homepage가 site root entry로서 매체 매거진 hub 4개와
          // schema-level entity 연결. Sprint 29~37 site-wide entity 시그널 정책 일관 적용.
          about: (() => {
            const hubs: Array<{
              '@type': 'CreativeWork';
              '@id': string;
              url: string;
              name: string;
            }> = [];
            const mapping: Array<[string, string]> = [
              ['회화', locale === 'en' ? 'Painting guide' : '회화 가이드'],
              ['판화', locale === 'en' ? 'Printmaking guide' : '판화 가이드'],
              ['사진', locale === 'en' ? 'Photography guide' : '사진 가이드'],
              ['조각', locale === 'en' ? 'Sculpture guide' : '조각 가이드'],
            ];
            for (const [cat, name] of mapping) {
              const slug = getMediumHubSlug(cat);
              if (!slug) continue;
              hubs.push({
                '@type': 'CreativeWork',
                '@id': `${SITE_URL}/stories/${slug}#about`,
                url: `${SITE_URL}/stories/${slug}`,
                name,
              });
            }
            return hubs;
          })(),
          // 홈페이지에서 음성검색 대응 — Hero h1만 매칭. 이전 .mission-banner /
          // .hero-subtitle selector는 실제 DOM에 존재하지 않아 schema 검사기가 4개
          // 오류로 보고하던 회귀(빈 매칭 = 검증 실패). 현재 h1은 HomeHero가 노출하는
          // 단일 캠페인 메시지(`home.nowShowing.{i18nKey}Title`)로 정상 매칭됨.
          speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: ['h1'],
          },
          audience: {
            '@type': 'PeopleAudience',
            audienceType:
              locale === 'en'
                ? 'Art collectors, first-time buyers, Korean art enthusiasts, cultural policy supporters'
                : '미술 컬렉터, 첫 그림 구매자, 한국 미술 관심층, 문화 정책 지지자',
          },
        }}
      />
      {/* BreadcrumbList — 홈은 self-reference 단일 노드지만 네이버 풍부결과 가이드 권장.
          다른 detail/category 페이지의 breadcrumb chain과 일관성 유지 + 검색 엔진이
          siteNavigationElement로 인식하는 보조 신호. */}
      <JsonLdScript
        data={createBreadcrumbSchema([
          { name: locale === 'en' ? 'Home' : '홈', url: buildLocaleUrl('/', locale) },
        ])}
      />
      <JsonLdScript data={generateExhibitionSchema([], locale, { artistCount })} />
      <JsonLdScript data={generateCampaignSchema(locale)} />
      {/* HowTo는 MechanismHowTo만 발행 (2026-06-12 감사) — 4단계 플로우가 MechanismSection으로
          화면에 실제 렌더되는 유일한 HowTo. 구매 가이드·조합원 가입·전시 즐기기 HowTo와
          QAPage(generateSAFCoreQA)는 본문에 존재하지 않는 invisible 콘텐츠라 Google 구조화
          데이터 가이드라인 위반(QAPage는 사용자 답변형 페이지 전용이기도 함) → 제거.
          해당 Q&A 콘텐츠의 AEO 가치는 llms.txt 채널이 유지한다. */}
      <JsonLdScript data={generateMechanismHowTo(locale)} />

      {/* Share buttons (hidden, for metadata) */}
      <div className="hidden">
        <ShareButtonsWrapper
          url={SITE_URL}
          title={t('shareTitle', counts)}
          description={t('shareDescription', counts)}
        />
      </div>
    </>
  );
}

// ─── Async server sub-components ──────────────────────────────────────────────

async function CategorySections({ locale }: { locale: string }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });

  // 카테고리당 8점으로 제한 — 정적 그리드(desktop 4 col × 2 row = 8점, mobile 2 col × 2 row = 4점).
  // 이전 ArtworkHighlightSlider(12점, auto-scroll loop)에서 정적 그리드로 전환하며 데이터 페치도
  // 4 × 8 = 32 카드로 축소. 회귀 trauma 4종(server island/idleCallback/DOM enhance/font preload:false)
  // 모두 회피하는 본질 패턴 — embla-carousel client hydration 비용 + AutoScroll RAF 제거.
  // 전체 카테고리는 viewAllHref(/artworks/category/...)에서 그리드로 안내됨.
  const [paintingArtworks, printArtworks, photoMediaArtworks, sculptureArtworks] =
    await Promise.all([
      getSupabaseArtworksByCategories(['회화', '한국화', '드로잉'], 8),
      getSupabaseArtworksByCategories(['판화', '사후판화', '아트프린트'], 8),
      getSupabaseArtworksByCategories(['사진', '디지털아트', '혼합매체'], 8),
      getSupabaseArtworksByCategories(['조각', '도자공예'], 8),
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
      viewAllHref: '/artworks/category/painting',
      theme: 'dark',
    },
    {
      artworks: printArtworks,
      title: t('sectionPrint'),
      viewAllHref: '/artworks/category/printmaking',
      theme: 'light',
    },
    {
      artworks: photoMediaArtworks,
      title: t('sectionPhotoMedia'),
      viewAllHref: '/artworks/category/photography',
      theme: 'dark',
    },
    {
      artworks: sculptureArtworks,
      title: t('sectionSculpture'),
      viewAllHref: '/artworks/category/sculpture',
      theme: 'light',
    },
  ];

  return (
    <>
      {sections.map((section) =>
        section.artworks.length > 0 ? (
          <ArtworkCategoryGrid
            key={section.title}
            locale={locale}
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
      {/* FAQPage JSON-LD는 /faq 한 곳에서만 발행 (2026-06-12 감사) — 동일 FAQ 목록을
          홈·/faq 두 페이지에 중복 마크업하면 Google FAQ 가이드라인 위반 (단일 페이지 원칙). */}
    </>
  );
}
