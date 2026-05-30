import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import PaperGrain from '@/components/common/PaperGrain';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { resolveLocale } from '@/lib/server-locale';
import { SITE_URL } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { ArrowRight } from 'lucide-react';
import {
  PETITION_OH_YOON_GOAL,
  PETITION_OH_YOON_PATH,
  PETITION_OH_YOON_SLUG,
} from '@/lib/petition/constants';

import ProgressBar from './_components/ProgressBar';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import ShareTemplates from './_components/ShareTemplates';
import PetitionFAQ from './_components/PetitionFAQ';
import ProposalModal from './_components/ProposalModal';
import SignForm from './_components/SignForm';
import CTAButtonGroup from '@/components/common/CTAButtonGroup';

// ISR revalidate=60: 60초마다 background 갱신.
// 카운터는 /api/petition/[slug]/counts edge-cached API route를 ProgressBar가 polling (N→1 결합).
// is_active만 SSR에서 petitions 단일 row lookup — view 풀스캔 없음.
export const revalidate = 60;

// DB 과부하 응급 차단 플래그 — true 시 fetchPetitionCount/ProgressBar polling 완전 비활성.
// 복구 시 false로 변경 후 재배포.
const MAINTENANCE_MODE = false;

const PAGE_URL = `${SITE_URL}${PETITION_OH_YOON_PATH}`;
const OH_YOON_PERSON_ID = `${SITE_URL}/special/oh-yoon#person-oh-yoon`;
const MURAL_IMAGE_URL = `${SITE_URL}/images/petition-oh-yoon/mural-1.png`;

async function fetchPetitionActive(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('petitions')
      .select('is_active')
      .eq('slug', PETITION_OH_YOON_SLUG)
      .maybeSingle();
    return data?.is_active ?? true;
  } catch {
    return true;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'petition.ohYoon',
  });
  const base = createStandardPageMetadata(
    t('metaTitle'),
    t('metaDescription'),
    PAGE_URL,
    PETITION_OH_YOON_PATH,
    locale
  );

  // 카카오톡·페이스북 등 OG 크롤러 미리보기에 1974년 구의동 양면 부조 사진을 노출.
  // createStandardPageMetadata가 기본 OG 이미지(/images/og-image.jpg)를 강제하므로
  // 청원 페이지는 작품 사진으로 명시 override한다. 절대 URL 필수 (외부 봇이 접근).
  const muralImageUrl = `${SITE_URL}/images/petition-oh-yoon/mural-1.png`;
  const muralImageAlt =
    locale === 'en'
      ? 'Oh Yoon, 1974 — terracotta mural at the former Sangup Bank Guui-dong branch'
      : '오윤, 1974, 테라코타 양면 부조 — 옛 상업은행 구의동지점';

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'article',
      images: [
        {
          url: muralImageUrl,
          secureUrl: muralImageUrl,
          type: 'image/png',
          width: 1280,
          height: 960,
          alt: muralImageAlt,
        },
      ],
    },
    twitter: {
      ...base.twitter,
      images: [{ url: muralImageUrl, alt: muralImageAlt }],
    },
  };
}

export default async function PetitionOhYoonPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'petition.ohYoon' });

  if (MAINTENANCE_MODE) {
    return (
      <main
        className={`min-h-screen flex flex-col items-center justify-center text-center px-4 bg-canvas ${SAWTOOTH_TOP_SAFE_PADDING}`}
      >
        <div className="max-w-lg">
          <h1 className="font-display font-bold text-2xl md:text-3xl text-charcoal-deep mb-4 break-keep">
            {locale === 'en' ? 'Temporarily Unavailable' : '잠시 접속이 제한됩니다'}
          </h1>
          <p className="text-charcoal-muted text-base md:text-lg mb-8 break-keep leading-relaxed">
            {locale === 'en'
              ? 'Due to high traffic, the petition page is temporarily unavailable. Your support matters — please try again in a few minutes. Signatures will be accepted once the page is restored.'
              : '많은 분들이 동시에 방문해 주셔서 페이지를 잠시 점검 중입니다. 점검이 완료된 후 서명이 정상 접수됩니다. 잠시 후 다시 방문해 주세요.'}
          </p>
          <p className="text-sm text-charcoal-soft mb-8">
            {locale === 'en' ? 'Inquiries: contact@kosmart.org' : '문의: contact@kosmart.org'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary-strong font-semibold hover:underline"
          >
            {locale === 'en' ? 'Back to homepage' : '홈으로 돌아가기'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </main>
    );
  }

  const is_active = await fetchPetitionActive();

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'SAF2026', url: SITE_URL },
    { name: t('breadcrumb'), url: PAGE_URL },
  ]);

  const isEnglish = locale === 'en';

  const ohYoonPerson = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': OH_YOON_PERSON_ID,
    name: isEnglish ? 'Oh Yoon' : '오윤',
    alternateName: isEnglish ? '오윤' : 'Oh Yoon',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? "Oh Yoon (1946–1986) was a pivotal figure in Korean people's art (minjung misul), known for bold woodblock prints depicting the lives of workers and farmers."
      : '오윤(1946–1986)은 민중미술의 대표 작가로, 노동자·농민의 삶을 담은 역동적인 판화로 한국 현대미술에 큰 족적을 남겼습니다.',
    birthDate: '1946',
    deathDate: '1986',
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    sameAs: [
      'https://ko.wikipedia.org/wiki/오윤_(화가)',
      'https://www.wikidata.org/wiki/Q18399737',
      `${SITE_URL}/special/oh-yoon`,
    ],
  };

  const aboutPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${PAGE_URL}#webpage`,
    name: t('metaTitle'),
    description: t('metaDescription'),
    url: PAGE_URL,
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
    isPartOf: { '@id': `${SITE_URL}#website` },
    about: { '@id': OH_YOON_PERSON_ID },
    primaryImageOfPage: { '@type': 'ImageObject', url: MURAL_IMAGE_URL },
  };

  const muralArtworkSchema = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: isEnglish
      ? 'Oh Yoon, 1974 — terracotta two-sided mural'
      : '오윤, 1974, 테라코타 양면 부조',
    creator: { '@id': OH_YOON_PERSON_ID },
    dateCreated: '1974',
    artMedium: isEnglish ? 'Terracotta' : '테라코타',
    artform: isEnglish ? 'Mural relief' : '부조',
    image: MURAL_IMAGE_URL,
    contentLocation: {
      '@type': 'Place',
      name: isEnglish ? 'Former Sangup Bank Guui-dong branch, Seoul' : '옛 상업은행 구의동지점',
    },
    subjectOf: { '@id': `${PAGE_URL}#webpage` },
  };

  const statementText = `${t('statementLine1')} ${t('statementLine2')} ${t('statementLine3')}`;

  return (
    <main className="bg-canvas text-pretty">
      <JsonLdScript data={[breadcrumbSchema, aboutPageSchema, ohYoonPerson, muralArtworkSchema]} />
      <PaperGrain />

      {/* 1부 HERO — 제목·부제·D-N·진행률·CTA가 모바일 한 화면에 (PRD §6.1 FR-LP-01) */}
      <section
        aria-labelledby="petition-hero-title"
        className="relative isolate overflow-hidden pt-28 md:pt-36 pb-20 bg-charcoal-deep text-white"
      >
        {/* 작품 사진 배경 (mural-2: 인체 부조 정면) */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <SafeImage
            src="/images/petition-oh-yoon/mural-2.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        {/* 다크 오버레이 — 단색 charcoal-deep로 텍스트 가독성 보장 (Apple radical subtraction) */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-charcoal-deep/80" />
        <div className="relative container-max text-center max-w-3xl mx-auto px-4">
          <h1
            id="petition-hero-title"
            className="font-display font-black text-4xl md:text-6xl leading-tight mb-4 break-keep [text-shadow:0_2px_18px_rgba(0,0,0,0.65)]"
          >
            {t('heroTitle')
              .split('\n')
              .map((line, i) => (
                <span key={i} className="block text-balance">
                  {line}
                </span>
              ))}
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-2 text-balance">{t('heroSubtitle')}</p>
          <p className="text-sm md:text-base opacity-80 mb-8 text-balance">
            {t('heroDeadlineLine')}
          </p>
          <div className="mb-8">
            <ProgressBar goal={PETITION_OH_YOON_GOAL} />
          </div>
          <a
            href="#sign-form"
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg text-lg font-bold bg-primary-strong hover:bg-primary-strong text-white transition-shadow hover:shadow-gallery-artwork focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span className="inline-flex items-center gap-2">
              {t('heroCta')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </span>
          </a>
        </div>
      </section>

      {/* 2부 위기 한 줄 — 어두운 배경 + 흰 글자 띠 (PRD §8.1) */}
      <section className="bg-charcoal-deep text-white py-6 px-4">
        <p className="container-max max-w-3xl mx-auto text-center text-base md:text-xl font-medium leading-relaxed break-keep text-balance">
          {t('crisis')}
        </p>
      </section>

      {/* 3부 작품 이야기 — 본문 2단락 + 작품 사진 그리드 (양면 새김 시각 입증) */}
      <Section variant="white" className="py-20 md:py-24">
        <div className="container-max max-w-5xl mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <SectionTitle as="h2" className="mb-8 md:mb-10">
              {t('storyHeading')}
            </SectionTitle>
            <aside
              aria-label={t('storyTributeLabel')}
              className="mb-10 rounded-2xl bg-canvas px-6 py-7 md:px-8 md:py-8"
            >
              <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center md:gap-8">
                <figure className="flex flex-col items-center md:items-start">
                  <div className="w-28 h-28 md:w-32 md:h-32 overflow-hidden rounded-full border-4 border-white shadow-md">
                    <SafeImage
                      src="/images/ohyoon.webp"
                      alt={t('storyPortraitAlt')}
                      width={256}
                      height={256}
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                  <figcaption className="mt-3 text-center md:text-left">
                    <span className="block text-sm font-semibold text-charcoal-deep">
                      {t('storyPortraitName')}
                    </span>
                    <span className="block text-xs text-charcoal-muted tracking-wider mt-0.5">
                      {t('storyPortraitCaption')}
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
                    {t('storyQuote')}
                  </p>
                  <footer className="mt-3 text-xs md:text-sm text-charcoal-muted tracking-widest uppercase">
                    — {t('storyQuoteAttribution')}
                  </footer>
                </blockquote>
              </div>
            </aside>
            <div className="space-y-6 text-base md:text-lg leading-relaxed text-charcoal break-keep">
              <p>{t('storyP1')}</p>
              <p>{t('storyP2')}</p>
              <p>{t('storyP3')}</p>
            </div>
          </div>

          {/* 작품 사진 3장 — 인체 부조 면(2장) + 반대 V자 부조 면(1장) */}
          <figure className="mt-10 grid gap-3 md:grid-cols-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <SafeImage
                src="/images/petition-oh-yoon/mural-1.png"
                alt={t('muralAltFront')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <SafeImage
                src="/images/petition-oh-yoon/mural-2.png"
                alt={t('muralAltDetail')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <SafeImage
                src="/images/petition-oh-yoon/mural-3.png"
                alt={t('muralAltBack')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
              <div className="absolute top-2 left-2 rounded bg-white/90 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-charcoal-deep">
                {t('muralOtherSideBadge')}
              </div>
            </div>
            <figcaption className="md:col-span-3 text-xs text-charcoal-muted text-center mt-1">
              {t('muralCaption')}
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* 4부 이미 시작된 일 — 세 가지 일 */}
      <Section variant="canvas" className="py-20 md:py-24">
        <div className="container-max max-w-5xl mx-auto px-4">
          <SectionTitle as="h2" className="mb-8 md:mb-10">
            {t('threeStepsHeading')}
          </SectionTitle>
          <p className="mb-10 text-base md:text-lg leading-relaxed text-charcoal-muted break-keep">
            {t('threeStepsLead')}
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: t('threeStepsCard1Title'), body: t('threeStepsCard1Body') },
              { title: t('threeStepsCard2Title'), body: t('threeStepsCard2Body') },
              { title: t('threeStepsCard3Title'), body: t('threeStepsCard3Body') },
            ].map((card) => (
              <article
                key={card.title}
                className="rounded-xl bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_0px_rgba(31,36,40,0.25)]"
              >
                <h3 className="font-semibold text-lg text-charcoal-deep mb-2 break-keep">
                  {card.title}
                </h3>
                <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep">
                  {card.body}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-12 md:mt-16 text-center font-display font-bold text-2xl md:text-3xl leading-snug text-primary-strong break-keep text-balance">
            {t('threeStepsBridge')}
          </p>
        </div>
      </Section>

      {/* 5부 청원 한 줄 — 강조 박스 (페이지 정중앙) */}
      <Section variant="white" className="py-20 md:py-24">
        <div className="container-max max-w-3xl mx-auto px-4 text-center">
          <div className="border-4 border-charcoal bg-canvas px-6 py-14 md:px-14 md:py-20 shadow-[8px_8px_0px_0px_rgba(31,36,40,0.35)]">
            <p className="font-display font-black text-2xl md:text-4xl leading-relaxed text-charcoal-deep break-keep">
              {t('statementLine1')}
              <br />
              {t('statementLine2')}
              <br />
              <strong className="text-primary-strong">{t('statementLine3')}</strong>
            </p>
            <div className="mt-8 flex justify-center">
              <ShareButtonsWrapper
                url={PAGE_URL}
                title={statementText}
                description={t('metaDescription')}
                imageUrl={`${SITE_URL}/images/petition-oh-yoon/mural-1.png`}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* 6부 참여 방법 — 3단 카드 + 폼 placeholder */}
      <Section variant="canvas" className="py-20 md:py-24" id="sign-form">
        <div className="container-max max-w-5xl mx-auto px-4">
          <SectionTitle as="h2" className="mb-8 md:mb-10">
            {t('participationHeading')}
          </SectionTitle>
          {/* 3카드 — 균등 길이, flex column으로 CTA를 하단에 정렬 */}
          <div className="grid gap-5 md:grid-cols-3 mb-12 items-stretch">
            <article className="flex flex-col rounded-xl bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_0px_rgba(31,36,40,0.35)]">
              <h3 className="font-semibold text-lg text-charcoal-deep mb-3 break-keep">
                {t('participationCard1Title')}
              </h3>
              <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep">
                {t('participationCard1Body')}
              </p>
              <a
                href="#sign-form-anchor"
                className="mt-auto pt-4 text-primary-strong font-semibold hover:underline text-sm"
              >
                ↓ {t('participationCard1Cta')}
              </a>
            </article>
            <article className="flex flex-col rounded-xl bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_0px_rgba(31,36,40,0.25)]">
              <h3 className="font-semibold text-lg text-charcoal-deep mb-3 break-keep">
                {t('participationCard2Title')}
              </h3>
              <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep">
                {t('participationCard2Body')}
              </p>
              <a
                href="#sign-form-anchor"
                className="mt-auto pt-4 text-primary-strong font-semibold hover:underline text-sm"
              >
                {t('participationCard2Cta')}
              </a>
            </article>
            <article className="flex flex-col rounded-xl bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_0px_rgba(31,36,40,0.25)]">
              <h3 className="font-semibold text-lg text-charcoal-deep mb-3 break-keep">
                {t('participationCard3Title')}
              </h3>
              <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep">
                {t('participationCard3Body')}
              </p>
              <a
                href="#share-templates"
                className="mt-auto pt-4 text-primary-strong font-semibold hover:underline text-sm"
              >
                ↓ {t('participationCard3Cta')}
              </a>
            </article>
          </div>

          {/* 카드 외부 — 사전 작성 공유 문구 박스 (3카드보다 별도 영역으로 분리) */}
          <div id="share-templates" className="mb-12 mx-auto max-w-2xl scroll-mt-24">
            <ShareTemplates url={PAGE_URL} />
          </div>

          <div id="sign-form-anchor" className="mx-auto max-w-2xl">
            {is_active ? (
              <SignForm url={PAGE_URL} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-canvas px-6 py-12 text-center">
                <p className="text-base text-charcoal-deep font-semibold">{t('closedTitle')}</p>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 7부 시점의 무게 — v1.1 구조: 헤드라인 + 참고 박스 */}
      <Section variant="white" className="py-20 md:py-24">
        <div className="container-max max-w-3xl mx-auto px-4">
          <SectionTitle as="h2" className="mb-8 md:mb-10">
            {t('urgencyHeading')}
          </SectionTitle>
          <p className="text-lg md:text-xl font-semibold text-charcoal-deep leading-relaxed break-keep text-balance mb-8">
            {t('urgencyLead')}
          </p>
          <div className="rounded-xl bg-canvas border border-gray-200 p-6">
            <p className="text-sm font-semibold text-charcoal-muted mb-3 uppercase tracking-wide">
              {t('urgencyNote')}
            </p>
            <ul className="space-y-2 text-base text-charcoal break-keep">
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ·
                </span>
                <span>{t('urgencyBullet1')}</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ·
                </span>
                <span>{t('urgencyBullet2')}</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ·
                </span>
                <span>{t('urgencyBullet3')}</span>
              </li>
            </ul>
          </div>
          <p className="mt-8 text-base md:text-lg leading-relaxed text-charcoal-muted break-keep text-balance">
            {t('urgencyTail')}
          </p>
        </div>
      </Section>

      {/* 8부 추진 주체 */}
      <Section variant="canvas" className="py-20 md:py-24">
        <div className="container-max max-w-3xl mx-auto px-4">
          <SectionTitle as="h2" className="mb-8 md:mb-10">
            {t('proponentsHeading')}
          </SectionTitle>
          <div className="space-y-4 text-base md:text-lg leading-relaxed text-charcoal break-keep">
            <p>{t('proponentsBody1')}</p>
            <p>{t('proponentsBody2')}</p>
            <p className="text-sm text-charcoal-muted italic pt-1">
              {t('proponentsCommitteeNote')}
            </p>
          </div>
        </div>
      </Section>

      {/* 9부 FAQ + 9b 씨앗페 관계 */}
      <Section variant="white" className="py-20 md:py-24">
        <div className="container-max max-w-3xl mx-auto px-4">
          <SectionTitle as="h2" className="mb-8 md:mb-10">
            {t('faqHeading')}
          </SectionTitle>
          <PetitionFAQ />
          <div className="mt-6 text-center">
            <ProposalModal />
          </div>

          <div className="mt-16 rounded-xl bg-canvas border-2 border-charcoal p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(31,36,40,0.25)]">
            <h3 className="font-display font-bold text-xl md:text-2xl text-charcoal-deep mb-3 break-keep">
              {t('saffestHeading')}
            </h3>
            <p className="text-base text-charcoal leading-relaxed break-keep mb-4">
              {t('saffestBody')}
            </p>
            <Link href="/" className="text-primary-strong font-semibold hover:underline text-sm">
              <span className="inline-flex items-center gap-1">
                {t('saffestCta')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      </Section>

      {/* 10부 오윤 40주기, 함께 기리는 자리 — closing 직전의 정서적 빌드업. 청원의 시점을 작가의 시대로 확장. 폼 제출 후 SignForm이 #petition-tribute-title로 스크롤 */}
      <Section
        variant="canvas"
        className="pt-20 md:pt-24 pb-20 md:pb-24"
        aria-labelledby="petition-tribute-title"
      >
        <div className="container-max max-w-3xl mx-auto px-4">
          <p className="text-eyebrow text-primary-strong text-center mb-3">{t('tributeEyebrow')}</p>
          <SectionTitle
            as="h2"
            id="petition-tribute-title"
            className="text-center mb-6 md:mb-8 scroll-mt-28 md:scroll-mt-32"
          >
            {t('tributeTitle')}
          </SectionTitle>
          <p className="text-base md:text-lg leading-relaxed text-charcoal text-center break-keep mb-12 md:mb-14 text-balance">
            {t('tributeLead')}
          </p>

          <div className="space-y-5 text-base md:text-lg leading-relaxed text-charcoal break-keep">
            <p>{t('tributeBody1')}</p>
            <p>{t('tributeBody2')}</p>
            <p>{t('tributeBody3')}</p>
          </div>

          {/* 듀얼 CTA 카드 — 작가 사진과 작품 안내 */}
          <article
            id="special-cta-card"
            className="mt-12 md:mt-14 overflow-hidden rounded-2xl bg-white border-2 border-charcoal shadow-[6px_6px_0px_0px_rgba(31,36,40,0.3)] scroll-mt-24"
          >
            <div className="md:grid md:grid-cols-[220px_1fr]">
              <div className="relative aspect-[4/5] md:aspect-auto md:h-full bg-charcoal-deep">
                <SafeImage
                  src="/images/ohyoon.webp"
                  alt={t('exhibitionCardImageAlt')}
                  fill
                  sizes="(min-width: 768px) 220px, 100vw"
                  className="object-cover grayscale"
                />
              </div>
              <div className="flex flex-col gap-4 p-6 md:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary-strong mb-2">
                    {t('exhibitionCardEyebrow')}
                  </p>
                  <h3 className="font-display font-bold text-2xl md:text-3xl text-charcoal-deep leading-tight break-keep">
                    {t('exhibitionCardTitle')}
                  </h3>
                  <p className="mt-1 text-sm md:text-base text-charcoal-muted break-keep">
                    {t('exhibitionCardSubtitle')}
                  </p>
                </div>
                <p className="text-sm md:text-base text-charcoal leading-relaxed break-keep">
                  {t('exhibitionCardBody')}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-2">
                  <Link
                    href="/special/oh-yoon"
                    className="inline-flex items-center justify-center rounded-lg bg-charcoal-deep hover:bg-charcoal text-white px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="inline-flex items-center gap-2">
                      {t('exhibitionCardCtaPrimary')}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </Link>
                  <Link
                    href={`/artworks/artist/${encodeURIComponent('오윤')}`}
                    className="inline-flex items-center justify-center rounded-lg border border-charcoal/20 bg-white hover:border-primary hover:text-primary-strong text-charcoal-deep px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="inline-flex items-center gap-2">
                      {t('exhibitionCardCtaSecondary')}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </article>

          {/* 미션 전환 — 서명자를 SAF 상호부조 미션으로 연결 */}
          <div className="mt-14 pt-10 border-t border-charcoal/10 text-center">
            <h3 className="font-display font-bold text-xl md:text-2xl text-charcoal-deep mb-3 break-keep">
              {t('missionBridgeHeading')}
            </h3>
            <p className="text-base text-charcoal leading-relaxed break-keep mb-6 max-w-xl mx-auto text-balance">
              {t('missionBridgeBody')}
            </p>
            <CTAButtonGroup
              variant="large"
              trackingPosition="petition-oh-yoon"
              className="justify-center"
            />
          </div>

          {/* 추가 탐색 링크 — 캠페인 방문자를 스토리/홈으로 연결하여 캠페인 종료 후 트래픽 유지 */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/our-reality"
              className="inline-flex items-center justify-center rounded-lg border border-charcoal/20 hover:border-primary hover:text-primary-strong text-charcoal-deep px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="inline-flex items-center gap-2">
                {t('exploreStoriesLabel')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-charcoal/20 hover:border-primary hover:text-primary-strong text-charcoal-deep px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="inline-flex items-center gap-2">
                {t('backToHomeLabel')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </div>

          <p className="mt-8 md:mt-10 text-sm text-charcoal-muted text-center break-keep italic">
            {t('tributeClosingNote')}
          </p>
        </div>
      </Section>

      {/* Retention 슬롯 — 청원 페이지가 GA4 11,477뷰(전체 89%)의 트래픽 진입로지만 다른
          페이지로의 retention이 거의 0%. 오윤 작가·민중미술·판화 hub로 link equity flow + 사용자
          dwell time 회복. 청원 후 자연스러운 다음 행동 유도. */}
      <Section variant="white" className="py-14 md:py-20">
        <div className="container-max max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-section font-bold text-charcoal-deep mb-3 text-center">
            오윤을 더 깊이 만나기
          </h2>
          <p className="text-sm md:text-base text-charcoal-muted mb-8 text-center break-keep">
            서명에 동참해주셔서 감사합니다. 오윤 작가의 다른 작품과 한국 민중미술의 계보를
            씨앗페에서 이어볼 수 있습니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/artworks/artist/오윤"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 hover:bg-canvas-strong transition-colors"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">씨앗페에서 작품 보기</div>
              <div className="text-base font-medium text-charcoal-deep leading-snug">
                오윤 작가 출품작 전체 — 사후판화 컬렉션과 정전 작품들
              </div>
            </Link>
            <Link
              href="/stories/oh-yun-40th-anniversary"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 hover:bg-canvas-strong transition-colors"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">매거진 정전 인터뷰</div>
              <div className="text-base font-medium text-charcoal-deep leading-snug">
                오윤 40주기 — 작가의 삶과 작품 세계를 정리한 씨앗페 매거진 헌정
              </div>
            </Link>
            <Link
              href="/stories/minjung-art-intro"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 hover:bg-canvas-strong transition-colors"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">민중미술 한 계보</div>
              <div className="text-base font-medium text-charcoal-deep leading-snug">
                민중미술이란 무엇인가 — 신학철·박불똥·박재동까지, 오윤이 속한 흐름
              </div>
            </Link>
            <Link
              href="/stories/korean-contemporary-printmaking-saf"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 hover:bg-canvas-strong transition-colors"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">한국 현대 판화 hub</div>
              <div className="text-base font-medium text-charcoal-deep leading-snug">
                한국 현대 판화의 다섯 계보 — 오윤·이철수·김준권·이윤엽·류연복
              </div>
            </Link>
          </div>
        </div>
      </Section>

      {/* 11부 마지막 결구 + 두 번째 CTA — HERO와 톤 통일(어두운 그라디언트). 페이지 마지막이라 SAWTOOTH_TOP_SAFE_PADDING으로 footer 톱니 안전 여백 흡수 */}
      <section
        aria-labelledby="petition-closing-title"
        className={`relative isolate overflow-hidden pt-24 md:pt-32 ${SAWTOOTH_TOP_SAFE_PADDING} text-center text-white bg-charcoal-deep`}
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-charcoal-deep" />
        <div className="relative container-max max-w-2xl mx-auto px-4">
          {!is_active && (
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide opacity-80">
              {t('closedTitle')}
            </p>
          )}
          <p className="text-xl md:text-2xl leading-relaxed mb-4 break-keep text-balance opacity-90">
            {t('closingLine1')}
          </p>
          <p className="text-xl md:text-2xl leading-relaxed mb-4 break-keep text-balance opacity-90">
            {t('closingLine2')}
          </p>
          <p
            id="petition-closing-title"
            className="font-display font-bold text-3xl md:text-4xl leading-tight mb-14 md:mb-16 break-keep text-balance"
          >
            {t('closingLine3')}
          </p>
          {is_active && (
            <a
              href="#sign-form-anchor"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg text-lg font-bold bg-primary-strong hover:bg-primary-strong text-white transition-shadow hover:shadow-gallery-artwork focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span className="inline-flex items-center gap-2">
                {t('closingCta')}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
