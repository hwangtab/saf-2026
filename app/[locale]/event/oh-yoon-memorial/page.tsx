import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import { Link } from '@/i18n/navigation';
import Section from '@/components/ui/Section';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
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

  return (
    <main className="bg-canvas text-pretty">
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
    </main>
  );
}
