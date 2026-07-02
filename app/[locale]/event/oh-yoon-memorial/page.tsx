import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import { Link } from '@/i18n/navigation';
import Section from '@/components/ui/Section';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { generateOhYoonMemorialEventSchema, generateFAQSchema } from '@/lib/schemas';
import { SITE_URL } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { getTossDomesticClientKey } from '@/lib/integrations/toss/config';
import { OH_YOON_MEMORIAL_SLUG, OH_YOON_MEMORIAL_PATH } from '@/content/events/oh-yoon-memorial';
import RegistrationForm from './_components/RegistrationForm';
import SeatStatusBar from './_components/SeatStatusBar';
import EventStory from './_components/EventStory';
import PrintGallery from './_components/PrintGallery';
import EventArtMeaning from './_components/EventArtMeaning';
import EventMeaning from './_components/EventMeaning';
import EventSchedule from './_components/EventSchedule';
import EventFAQ from './_components/EventFAQ';

// 좌석 현황은 service_role RPC로 조회하는 실시간 데이터 → 요청 시 렌더(빌드 prerender 회피).
export const dynamic = 'force-dynamic';

const PAGE_URL = `${SITE_URL}${OH_YOON_MEMORIAL_PATH}`;

type Props = { params: Promise<{ locale: string }> };

interface SeatStatus {
  found: boolean;
  capacity: number;
  occupied: number;
  remaining: number;
  is_open: boolean;
  fee_per_person: number;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'event.ohYoonMemorial' });
  const base = createStandardPageMetadata(
    t('metaTitle'),
    t('metaDescription'),
    PAGE_URL,
    OH_YOON_MEMORIAL_PATH,
    locale
  );

  // OG/트위터 이미지: 동적 opengraph-image.tsx 라우트를 가리킨다. 단, 파일 컨벤션이
  // 자동 생성하는 URL은 기본 locale(ko)에서 `/ko/...`가 되는데 next-intl 'as-needed'
  // 미들웨어가 이를 308로 리다이렉트한다 → 카카오톡 등 OG 크롤러는 이미지 리다이렉트를
  // 따라가지 않아 썸네일이 누락된다(2026-06-17 회귀). buildLocaleUrl로 리다이렉트 없는
  // 절대 URL(ko=무접두, en=/en)을 og:image로 직접 지정한다.
  const ogImageUrl = buildLocaleUrl(`${OH_YOON_MEMORIAL_PATH}/opengraph-image`, locale);
  const ogImage = {
    url: ogImageUrl,
    width: 1200,
    height: 630,
    alt: '오윤 40주기 추도식 — 2026년 7월 5일, 인사동',
  };
  const openGraph = base.openGraph ? { ...base.openGraph, images: [ogImage] } : undefined;
  const twitter = base.twitter ? { ...base.twitter, images: [ogImage] } : undefined;

  return { ...base, openGraph, twitter };
}

async function fetchSeatStatus(): Promise<SeatStatus | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('event_seat_status', { p_slug: OH_YOON_MEMORIAL_SLUG });
    if (error || !data) return null;
    return data as unknown as SeatStatus;
  } catch (err) {
    console.error('[event-page] seat status fetch failed:', err);
    return null;
  }
}

export default async function OhYoonMemorialEventPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'event.ohYoonMemorial' });
  const seat = await fetchSeatStatus();
  const clientKey = getTossDomesticClientKey();

  const remaining = seat?.remaining ?? 0;
  const isOpen = seat?.is_open ?? false;
  const feePerPerson = seat?.fee_per_person ?? 30000;

  // 구조화 데이터: Event(행사 일시·집결지·회비) + FAQPage(EventFAQ와 동일한 6문항).
  // Google Event rich result + AI "오윤 추도식 언제/회비" 인용 대상.
  const schemaLocale = locale === 'en' ? 'en' : 'ko';
  const eventSchema = generateOhYoonMemorialEventSchema(schemaLocale);
  const faqSchema = generateFAQSchema(
    [1, 2, 3, 4, 5, 6].map((n) => ({
      question: t(`faqQ${n}`),
      answer: t(`faqA${n}`),
    })),
    schemaLocale
  );

  return (
    <main className="bg-canvas text-pretty">
      <JsonLdScript data={[eventSchema, faqSchema]} />
      <PageHero
        title={t('heroTitle')}
        description={t('heroSubtitle')}
        customBackgroundImage="https://khtunrybrzntlnowlahb.supabase.co/storage/v1/object/public/artworks/398f3739-b81e-4ba8-bcd0-fed2e53d3dc8/1006__original.webp"
      >
        <SeatStatusBar remaining={remaining} isOpen={isOpen} />
      </PageHero>

      {/* 참가 신청 — 상단 우선 노출 */}
      <Section variant="white" id="apply">
        <div className="container-max">
          <div className="mx-auto max-w-xl">
            <h2 className="text-center font-display text-2xl font-bold text-charcoal-deep md:text-3xl">
              {t('applyTitle')}
            </h2>
            <p className="mt-2 text-center text-charcoal-muted break-keep">{t('applyLead')}</p>
            <RegistrationForm
              isOpen={isOpen}
              remaining={remaining}
              feePerPerson={feePerPerson}
              clientKey={clientKey}
            />
            <p className="mt-4 text-center text-sm text-charcoal-muted">
              <Link href="/event/oh-yoon-memorial/manage" className="underline hover:text-primary">
                {t('manageLink')}
              </Link>
            </p>
          </div>
        </div>
      </Section>

      {/* 추도식 안내 */}
      <Section variant="canvas-soft">
        <EventSchedule />
      </Section>

      {/* 오윤 이야기 */}
      <Section variant="white">
        <EventStory />
      </Section>

      {/* 오윤의 판화 — 작품 */}
      <Section variant="canvas-soft">
        <PrintGallery />
      </Section>

      {/* 작품 세계의 의의 — 민중적·예술적 */}
      <Section variant="white">
        <EventArtMeaning />
      </Section>

      {/* 추도식의 의의 */}
      <Section variant="canvas-soft">
        <EventMeaning />
      </Section>

      {/* FAQ */}
      <Section variant="white">
        <EventFAQ />
      </Section>

      {/* 오윤 클러스터 retention — 추도식은 GA4 트래픽 2위 진입로지만 다른 오윤 자산으로의
          internal link가 0인 dead-end였다. 신청 CTA(상단) 하단에 배치해 신청 전환은 방해하지
          않으면서, 행사 관심 방문자를 갤러리·청원·펀딩·매거진으로 흘려보내 link equity를
          허브로 모은다. (펀딩 카드는 청원과 대칭 — petition도 funding을 링크.) */}
      <Section variant="canvas-soft" className="py-14 md:py-20">
        <div className="container-max max-w-4xl">
          <h2 className="mb-3 text-center font-section text-2xl font-bold text-charcoal-deep md:text-3xl">
            {t('relatedHub.heading')}
          </h2>
          <p className="mb-8 text-center text-sm text-charcoal-muted break-keep md:text-base">
            {t('relatedHub.intro')}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href="/artworks/artist/오윤"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 transition-colors hover:bg-canvas-strong"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">
                {t('relatedHub.galleryEyebrow')}
              </div>
              <div className="text-base font-medium leading-snug text-charcoal-deep">
                {t('relatedHub.galleryTitle')}
              </div>
            </Link>
            <Link
              href="/petition/oh-yoon"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 transition-colors hover:bg-canvas-strong"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">
                {t('relatedHub.petitionEyebrow')}
              </div>
              <div className="text-base font-medium leading-snug text-charcoal-deep">
                {t('relatedHub.petitionTitle')}
              </div>
            </Link>
            <Link
              href="/funding/oh-yoon-terracotta"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 transition-colors hover:bg-canvas-strong"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">
                {t('relatedHub.fundingEyebrow')}
              </div>
              <div className="text-base font-medium leading-snug text-charcoal-deep">
                {t('relatedHub.fundingTitle')}
              </div>
            </Link>
            <Link
              href="/exhibition/oh-yoon-terracotta"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 transition-colors hover:bg-canvas-strong"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">
                {t('relatedHub.exhibitionEyebrow')}
              </div>
              <div className="text-base font-medium leading-snug text-charcoal-deep">
                {t('relatedHub.exhibitionTitle')}
              </div>
            </Link>
            <Link
              href="/stories/oh-yun-40th-anniversary"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 transition-colors hover:bg-canvas-strong"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">
                {t('relatedHub.story40thEyebrow')}
              </div>
              <div className="text-base font-medium leading-snug text-charcoal-deep">
                {t('relatedHub.story40thTitle')}
              </div>
            </Link>
            <Link
              href="/stories/oh-yun-song-of-the-blade"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 transition-colors hover:bg-canvas-strong"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">
                {t('relatedHub.storyBladeEyebrow')}
              </div>
              <div className="text-base font-medium leading-snug text-charcoal-deep">
                {t('relatedHub.storyBladeTitle')}
              </div>
            </Link>
            <Link
              href="/stories/oh-yoon-estate-print-guide"
              className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 transition-colors hover:bg-canvas-strong"
            >
              <div className="text-eyebrow mb-2 text-primary-strong">
                {t('relatedHub.storyPrintEyebrow')}
              </div>
              <div className="text-base font-medium leading-snug text-charcoal-deep">
                {t('relatedHub.storyPrintTitle')}
              </div>
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}
