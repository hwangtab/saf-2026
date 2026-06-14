import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import { createStandardPageMetadata } from '@/lib/seo';
import { resolveLocale } from '@/lib/server-locale';
import { SITE_URL } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { getTossDomesticClientKey } from '@/lib/integrations/toss/config';
import { OH_YOON_MEMORIAL_SLUG, OH_YOON_MEMORIAL_PATH } from '@/content/events/oh-yoon-memorial';
import RegistrationForm from './_components/RegistrationForm';
import SeatStatusBar from './_components/SeatStatusBar';
import EventStory from './_components/EventStory';
import MuralGallery from './_components/MuralGallery';
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
  return createStandardPageMetadata(
    t('metaTitle'),
    t('metaDescription'),
    PAGE_URL,
    OH_YOON_MEMORIAL_PATH,
    locale
  );
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
        customBackgroundImage="/images/petition-oh-yoon/mural-2.png"
      >
        <SeatStatusBar remaining={remaining} isOpen={isOpen} />
      </PageHero>

      {/* 오윤 이야기 */}
      <Section variant="white">
        <EventStory />
      </Section>

      {/* 1974 구의동 벽화 */}
      <Section variant="canvas-soft">
        <MuralGallery />
      </Section>

      {/* 추도식 안내 */}
      <Section variant="white">
        <EventSchedule />
      </Section>

      {/* 참가 신청 */}
      <Section variant="canvas" id="apply">
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
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="white">
        <EventFAQ />
      </Section>
    </main>
  );
}
