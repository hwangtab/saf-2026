import type { Metadata } from 'next';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { getLocale, getTranslations } from 'next-intl/server';

import LinkButton from '@/components/ui/LinkButton';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
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
  PETITION_OH_YOON_PROPOSAL_PDF,
  PETITION_OH_YOON_SLUG,
} from '@/lib/petition/constants';

import CountdownTimer from './_components/CountdownTimer';
import ProgressBar from './_components/ProgressBar';
import ShareKit from './_components/ShareKit';
import ShareTemplates from './_components/ShareTemplates';
import PetitionFAQ from './_components/PetitionFAQ';
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
  // OG 이미지는 같은 디렉토리의 opengraph-image.tsx가 Next.js convention으로 자동 적용.
  // 작품 사진 + 다크 오버레이 + 슬로건 합성, 1200×630.
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'article',
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
    <main className={`bg-canvas ${SAWTOOTH_TOP_SAFE_PADDING}`}>
      <JsonLdScript data={breadcrumbSchema} />

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
        {/* 다크 오버레이 — 텍스트 가독성 + 작품 톤 살리기 */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-br from-charcoal-deep/90 via-charcoal/80 to-primary-strong/70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
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
            className="font-display text-4xl md:text-6xl leading-tight mb-4 break-keep text-balance whitespace-pre-line"
          >
            {t('heroTitle')}
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
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg text-lg font-bold bg-sun-500 hover:bg-sun-400 text-charcoal-deep transition-all hover:scale-[1.03] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t('heroCta')} →
          </a>
        </div>
      </section>

      {/* 2부 위기 한 줄 — 어두운 배경 + 흰 글자 띠 (PRD §8.1) */}
      <section className="bg-charcoal-deep text-white py-6 px-4">
        <p className="container-max max-w-3xl mx-auto text-center text-base md:text-xl font-medium leading-relaxed break-keep">
          {t('crisis')}
        </p>
      </section>

      {/* 3부 작품 이야기 — 본문 2단락 + 작품 사진 그리드 (양면 새김 시각 입증) */}
      <Section variant="white" className="py-20 md:py-24">
        <div className="container-max max-w-5xl mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <SectionTitle as="h2">{t('storyHeading')}</SectionTitle>
            <div className="space-y-6 text-base md:text-lg leading-relaxed text-charcoal break-keep">
              <p>{t('storyP1')}</p>
              <p>{t('storyP2')}</p>
            </div>
          </div>

          {/* 작품 사진 3장 — 인체 부조 면(2장) + 반대 V자 부조 면(1장) */}
          <figure className="mt-10 grid gap-3 md:grid-cols-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <ExportedImage
                src="/images/petition-oh-yoon/mural-1.png"
                alt="오윤, 1974, 테라코타 벽화 — 정면(인체 부조)"
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <ExportedImage
                src="/images/petition-oh-yoon/mural-2.png"
                alt="오윤, 1974, 테라코타 벽화 — 인체 부조 디테일"
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-charcoal-deep">
              <ExportedImage
                src="/images/petition-oh-yoon/mural-3.png"
                alt="오윤, 1974, 테라코타 벽화 — 반대 면(추상 부조)"
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="md:col-span-3 text-xs text-charcoal-muted text-center mt-1">
              서울 광진구 구의동 현장. 양면에 새겨진 테라코타 부조 — 인체 부조 면(좌·중)과 추상 부조
              면(우).
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* 4부 이미 시작된 일 — 세 가지 일 */}
      <Section variant="canvas-soft" className="py-20 md:py-24">
        <div className="container-max max-w-5xl mx-auto px-4">
          <SectionTitle as="h2">{t('threeStepsHeading')}</SectionTitle>
          <p className="mb-10 text-base md:text-lg leading-relaxed text-charcoal-muted break-keep">
            {t('threeStepsLead')}
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: t('threeStepsCard1Title'), body: t('threeStepsCard1Body'), tone: 'soft' },
              { title: t('threeStepsCard2Title'), body: t('threeStepsCard2Body'), tone: 'strong' },
              { title: t('threeStepsCard3Title'), body: t('threeStepsCard3Body'), tone: 'strong' },
            ].map((card) => (
              <article
                key={card.title}
                className={`rounded-xl bg-white p-6 shadow-sm border ${
                  card.tone === 'strong' ? 'border-primary/20' : 'border-gray-200'
                }`}
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
          <div className="rounded-2xl border-y-4 border-primary px-6 py-12 md:px-12 md:py-16 bg-canvas">
            <p className="font-display text-2xl md:text-4xl leading-relaxed text-charcoal-deep break-keep">
              {t('statementLine1')}
              <br />
              {t('statementLine2')}
              <br />
              <strong className="text-primary-strong">{t('statementLine3')}</strong>
            </p>
            <div className="mt-8">
              <ShareKit url={PAGE_URL} text={statementText} className="!justify-center" />
            </div>
          </div>
        </div>
      </Section>

      {/* 6부 참여 방법 — 3단 카드 + 폼 placeholder */}
      <Section variant="canvas-soft" className="py-20 md:py-24" id="sign-form">
        <div className="container-max max-w-5xl mx-auto px-4">
          <SectionTitle as="h2">{t('participationHeading')}</SectionTitle>
          <div className="grid gap-5 md:grid-cols-3 mb-10">
            <article className="rounded-xl bg-white p-6 shadow-sm border border-primary/30">
              <h3 className="font-semibold text-lg text-charcoal-deep mb-2 break-keep">
                {t('participationCard1Title')}
              </h3>
              <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep mb-4">
                {t('participationCard1Body')}
              </p>
              <a
                href="#sign-form-anchor"
                className="text-primary font-semibold hover:underline text-sm"
              >
                ↓ {t('participationCard1Cta')}
              </a>
            </article>
            <article className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg text-charcoal-deep mb-2 break-keep">
                {t('participationCard2Title')}
              </h3>
              <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep">
                {t('participationCard2Body')}
              </p>
            </article>
            <article className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg text-charcoal-deep mb-2 break-keep">
                {t('participationCard3Title')}
              </h3>
              <p className="text-charcoal text-sm md:text-base leading-relaxed break-keep mb-4">
                {t('participationCard3Body')}
              </p>
              <ShareKit url={PAGE_URL} text={statementText} className="!justify-start" />
              <ShareTemplates url={PAGE_URL} />
            </article>
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
          <SectionTitle as="h2">{t('urgencyHeading')}</SectionTitle>
          <p className="text-lg md:text-xl font-semibold text-charcoal-deep leading-relaxed break-keep mb-8">
            {t('urgencyLead')}
          </p>
          <div className="rounded-xl bg-canvas border border-gray-200 p-6">
            <p className="text-sm font-semibold text-charcoal-muted mb-3 uppercase tracking-wide">
              {t('urgencyNote')}
            </p>
            <ul className="space-y-2 text-base text-charcoal break-keep">
              <li>· {t('urgencyBullet1')}</li>
              <li>· {t('urgencyBullet2')}</li>
              <li>· {t('urgencyBullet3')}</li>
            </ul>
          </div>
          <p className="mt-8 text-base md:text-lg leading-relaxed text-charcoal-muted break-keep">
            {t('urgencyTail')}
          </p>
        </div>
      </Section>

      {/* 8부 추진 주체 */}
      <Section variant="canvas-soft" className="py-20 md:py-24">
        <div className="container-max max-w-3xl mx-auto px-4">
          <SectionTitle as="h2">{t('proponentsHeading')}</SectionTitle>
          <div className="space-y-4 text-base md:text-lg leading-relaxed text-charcoal break-keep">
            <p>{t('proponentsBody1')}</p>
            <p>{t('proponentsBody2')}</p>
            <p className="text-sm text-charcoal-muted italic">{t('proponentsCommitteeNote')}</p>
          </div>
        </div>
      </Section>

      {/* 9부 FAQ + 9b 씨앗페 관계 */}
      <Section variant="white" className="py-20 md:py-24">
        <div className="container-max max-w-3xl mx-auto px-4">
          <SectionTitle as="h2">{t('faqHeading')}</SectionTitle>
          <PetitionFAQ />
          <div className="mt-6 text-center">
            <LinkButton href={PETITION_OH_YOON_PROPOSAL_PDF} variant="ghost" size="sm" external>
              {t('faqProposalLink')}
            </LinkButton>
          </div>

          <div className="mt-16 rounded-xl bg-canvas border border-gray-200 p-6 md:p-8">
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

      {/* 10부 마지막 결구 + 두 번째 CTA */}
      <Section variant="primary" className="py-24 md:py-32 text-center">
        <div className="container-max max-w-2xl mx-auto px-4">
          {!is_active && (
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide opacity-80">
              {t('closedTitle')}
            </p>
          )}
          <p className="text-xl md:text-2xl leading-relaxed mb-3 break-keep opacity-90">
            {t('closingLine1')}
          </p>
          <p className="text-xl md:text-2xl leading-relaxed mb-3 break-keep opacity-90">
            {t('closingLine2')}
          </p>
          <p className="font-display text-3xl md:text-4xl leading-tight mb-10 break-keep">
            {t('closingLine3')}
          </p>
          {is_active && (
            <a
              href="#sign-form-anchor"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg text-lg font-bold bg-sun-500 hover:bg-sun-400 text-charcoal-deep transition-all hover:scale-[1.03] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t('closingCta')} →
            </a>
          )}
        </div>
      </Section>
    </main>
  );
}
