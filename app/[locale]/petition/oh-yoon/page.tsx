import type { Metadata } from 'next';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { getLocale, getTranslations } from 'next-intl/server';

import PaperGrain from '@/components/common/PaperGrain';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { resolveLocale } from '@/lib/server-locale';
import { SITE_URL } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  PETITION_OH_YOON_DEADLINE_ISO,
  PETITION_OH_YOON_GOAL,
  PETITION_OH_YOON_PATH,
  PETITION_OH_YOON_SLUG,
} from '@/lib/petition/constants';

import CountdownTimer from './_components/CountdownTimer';
import ProgressBar from './_components/ProgressBar';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import ShareTemplates from './_components/ShareTemplates';
import PetitionFAQ from './_components/PetitionFAQ';
import ProposalModal from './_components/ProposalModal';
import SignForm from './_components/SignForm';

export const revalidate = 60; // 60초 ISR — 카운터 baseline 갱신 (PRD §10.8)

const PAGE_URL = `${SITE_URL}${PETITION_OH_YOON_PATH}`;

interface PetitionCount {
  total: number;
  region_top_count: number;
  recent_24h: number;
  is_active: boolean;
}

async function fetchPetitionCount(): Promise<PetitionCount> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('petition_counts')
      .select('total, region_top_count, recent_24h, is_active')
      .eq('petition_slug', PETITION_OH_YOON_SLUG)
      .maybeSingle();
    return {
      total: data?.total ?? 0,
      region_top_count: data?.region_top_count ?? 0,
      recent_24h: data?.recent_24h ?? 0,
      is_active: data?.is_active ?? true,
    };
  } catch {
    return { total: 0, region_top_count: 0, recent_24h: 0, is_active: true };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
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

export default async function PetitionOhYoonPage() {
  const t = await getTranslations('petition.ohYoon');
  const locale = resolveLocale(await getLocale());
  const { total, region_top_count, recent_24h, is_active } = await fetchPetitionCount();

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'SAF2026', url: SITE_URL },
    { name: t('breadcrumb'), url: PAGE_URL },
  ]);

  const statementText = `${t('statementLine1')} ${t('statementLine2')} ${t('statementLine3')}`;

  return (
    <main className="bg-canvas text-pretty">
      <JsonLdScript data={breadcrumbSchema} />
      <PaperGrain />

      {/* 1부 HERO — 제목·부제·D-N·진행률·CTA가 모바일 한 화면에 (PRD §6.1 FR-LP-01) */}
      <section
        aria-labelledby="petition-hero-title"
        className="relative isolate overflow-hidden pt-28 md:pt-36 pb-20 bg-charcoal-deep text-white"
      >
        {/* 작품 사진 배경 (mural-2: 인체 부조 정면) */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <ExportedImage
            src="/images/petition-oh-yoon/mural-2.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        {/* 다크 오버레이 — 텍스트 가독성 강화 (작품 톤은 가장자리에서 살짝 살린다) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-br from-charcoal-deep/85 via-charcoal/72 to-primary-strong/55"
        />
        {/* 슬로건 영역 추가 어두움 — 중앙 vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(15,23,33,0.28) 0%, transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
          style={{
            background:
              'radial-gradient(ellipse at 25% 0%, rgba(255,255,255,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(255,224,138,0.18) 0%, transparent 55%)',
          }}
        />
        <div className="relative container-max text-center max-w-3xl mx-auto px-4">
          <p className="text-sm md:text-base font-medium opacity-90 mb-4">
            <CountdownTimer deadlineIso={PETITION_OH_YOON_DEADLINE_ISO} />
          </p>
          <h1
            id="petition-hero-title"
            className="font-display text-4xl md:text-6xl leading-tight mb-4 break-keep"
            style={{ textShadow: '0 2px 18px rgba(0,0,0,0.65)' }}
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
            <ProgressBar
              initialTotal={total}
              goal={PETITION_OH_YOON_GOAL}
              initialRegionTopCount={region_top_count}
              initialRecent24h={recent_24h}
            />
          </div>
          <a
            href="#sign-form"
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg text-lg font-bold bg-sun hover:bg-sun-strong text-charcoal-deep transition-all hover:scale-[1.03] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t('heroCta')} →
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
              className="mb-10 rounded-2xl bg-canvas-soft px-6 py-7 md:px-8 md:py-8"
            >
              <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center md:gap-8">
                <figure className="flex flex-col items-center md:items-start">
                  <div className="w-28 h-28 md:w-32 md:h-32 overflow-hidden rounded-full border-4 border-white shadow-md">
                    <ExportedImage
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
                    className="absolute -left-1 -top-4 md:-left-2 md:-top-5 text-6xl md:text-7xl leading-none text-charcoal/15 font-display select-none"
                  >
                    &ldquo;
                  </span>
                  <p className="relative font-display italic text-xl md:text-2xl leading-snug text-charcoal-deep break-keep">
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
              <ExportedImage
                src="/images/petition-oh-yoon/mural-1.png"
                alt={t('muralAltFront')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <ExportedImage
                src="/images/petition-oh-yoon/mural-2.png"
                alt={t('muralAltDetail')}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <ExportedImage
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
      <Section variant="canvas-soft" className="py-20 md:py-24">
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
                className="rounded-xl bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_0px_rgba(247,152,36,0.25)]"
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
          <p className="mt-10 text-center text-base md:text-lg font-semibold text-primary-strong break-keep">
            {t('threeStepsBridge')}
          </p>
        </div>
      </Section>

      {/* 5부 청원 한 줄 — 강조 박스 (페이지 정중앙) */}
      <Section variant="white" className="py-20 md:py-24">
        <div className="container-max max-w-3xl mx-auto px-4 text-center">
          <div className="border-4 border-charcoal bg-canvas-soft px-6 py-14 md:px-14 md:py-20 shadow-[8px_8px_0px_0px_rgba(247,152,36,0.35)]">
            {/* 청원 동의문 본문 — PartialSansKR(font-display)가 가운뎃점(·) 글리프를 안 가져 빠지므로 일반 sans 폰트 사용 */}
            <p className="font-bold text-2xl md:text-4xl leading-relaxed text-charcoal-deep break-keep">
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
      <Section variant="canvas-soft" className="py-20 md:py-24" id="sign-form">
        <div className="container-max max-w-5xl mx-auto px-4">
          <SectionTitle as="h2" className="mb-8 md:mb-10">
            {t('participationHeading')}
          </SectionTitle>
          {/* 3카드 — 균등 길이, flex column으로 CTA를 하단에 정렬 */}
          <div className="grid gap-5 md:grid-cols-3 mb-12 items-stretch">
            <article className="flex flex-col rounded-xl bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_0px_rgba(247,152,36,0.35)]">
              <h3 className="font-semibold text-lg text-charcoal-deep mb-3 break-keep">
                {t('participationCard1Title')}
              </h3>
              <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep">
                {t('participationCard1Body')}
              </p>
              <a
                href="#sign-form-anchor"
                className="mt-auto pt-4 text-primary font-semibold hover:underline text-sm"
              >
                ↓ {t('participationCard1Cta')}
              </a>
            </article>
            <article className="flex flex-col rounded-xl bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_0px_rgba(247,152,36,0.25)]">
              <h3 className="font-semibold text-lg text-charcoal-deep mb-3 break-keep">
                {t('participationCard2Title')}
              </h3>
              <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep">
                {t('participationCard2Body')}
              </p>
              <a
                href="#sign-form-anchor"
                className="mt-auto pt-4 text-primary font-semibold hover:underline text-sm"
              >
                {t('participationCard2Cta')}
              </a>
            </article>
            <article className="flex flex-col rounded-xl bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_0px_rgba(247,152,36,0.25)]">
              <h3 className="font-semibold text-lg text-charcoal-deep mb-3 break-keep">
                {t('participationCard3Title')}
              </h3>
              <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep">
                {t('participationCard3Body')}
              </p>
              <a
                href="#share-templates"
                className="mt-auto pt-4 text-primary font-semibold hover:underline text-sm"
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
              <SignForm />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-canvas-soft px-6 py-12 text-center">
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
      <Section variant="canvas-soft" className="py-20 md:py-24">
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

          {/* 특별전 + 작품 듀얼 CTA 카드 — 청원 외 오윤 40주기 노출 강화 */}
          <article className="mt-12 overflow-hidden rounded-2xl bg-white border-2 border-charcoal shadow-[6px_6px_0px_0px_rgba(247,152,36,0.3)]">
            <div className="md:grid md:grid-cols-[220px_1fr]">
              <div className="relative aspect-[4/5] md:aspect-auto md:h-full bg-charcoal-deep">
                <ExportedImage
                  src="/images/ohyoon.webp"
                  alt={t('exhibitionCardImageAlt')}
                  fill
                  sizes="(min-width: 768px) 220px, 100vw"
                  className="object-cover grayscale"
                />
              </div>
              <div className="flex flex-col gap-4 p-6 md:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
                    {t('exhibitionCardEyebrow')}
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl text-charcoal-deep leading-tight break-keep">
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
                    href={`/${locale}/special/oh-yoon`}
                    className="inline-flex items-center justify-center rounded-lg bg-charcoal-deep hover:bg-charcoal text-white px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t('exhibitionCardCtaPrimary')} →
                  </Link>
                  <Link
                    href={`/${locale}/artworks/artist/${encodeURIComponent('오윤')}`}
                    className="inline-flex items-center justify-center rounded-lg border border-charcoal/20 bg-white hover:border-primary hover:text-primary-strong text-charcoal-deep px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t('exhibitionCardCtaSecondary')} →
                  </Link>
                </div>
              </div>
            </div>
          </article>
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

          <div className="mt-16 rounded-xl bg-canvas border-2 border-charcoal p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(247,152,36,0.25)]">
            <h3 className="font-display text-xl md:text-2xl text-charcoal-deep mb-3 break-keep">
              {t('saffestHeading')}
            </h3>
            <p className="text-base text-charcoal leading-relaxed break-keep mb-4">
              {t('saffestBody')}
            </p>
            <Link
              href={`/${locale}`}
              className="text-primary font-semibold hover:underline text-sm"
            >
              {t('saffestCta')} →
            </Link>
          </div>
        </div>
      </Section>

      {/* 10부 마지막 결구 + 두 번째 CTA — HERO와 톤 통일 (어두운 그라디언트로 페이지 감싸기) */}
      {/* closing section이 main 마지막이라 SAFE_PADDING을 자체 pb로 흡수 — 어두운 색이 톱니구분선까지 이어져 연노란 띠 노출 차단 */}
      <section
        aria-labelledby="petition-closing-title"
        className="relative isolate overflow-hidden pt-24 md:pt-32 pb-48 md:pb-64 text-center text-white bg-charcoal-deep"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-br from-charcoal-deep via-charcoal to-primary-strong/80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(255,224,138,0.18) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.12) 0%, transparent 60%)',
          }}
        />
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
            className="font-display text-3xl md:text-4xl leading-tight mb-14 md:mb-16 break-keep text-balance"
          >
            {t('closingLine3')}
          </p>
          {is_active && (
            <a
              href="#sign-form-anchor"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg text-lg font-bold bg-sun hover:bg-sun-strong text-charcoal-deep transition-all hover:scale-[1.03] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t('closingCta')} →
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
