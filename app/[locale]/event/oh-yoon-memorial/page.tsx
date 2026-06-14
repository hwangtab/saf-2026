import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { createStandardPageMetadata } from '@/lib/seo';
import { resolveLocale } from '@/lib/server-locale';
import { SITE_URL } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { getTossDomesticClientKey } from '@/lib/integrations/toss/config';
import { OH_YOON_MEMORIAL_SLUG, OH_YOON_MEMORIAL_PATH } from '@/content/events/oh-yoon-memorial';
import RegistrationForm from './_components/RegistrationForm';
import SeatStatusBar from './_components/SeatStatusBar';
import EventSchedule from './_components/EventSchedule';
import EventFAQ from './_components/EventFAQ';

export const revalidate = 60;

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
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('event_seat_status', { p_slug: OH_YOON_MEMORIAL_SLUG });
  if (error || !data) return null;
  return data as unknown as SeatStatus;
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
      <section className="relative isolate overflow-hidden bg-charcoal-deep px-4 pb-20 pt-28 text-white md:pt-36">
        <div className="container-max relative mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-black md:text-6xl">{t('heroTitle')}</h1>
          <p className="mt-4 text-lg opacity-90 md:text-xl">{t('heroSubtitle')}</p>
          <p className="mt-2 font-semibold text-sun">{t('feeNotice')}</p>
          <SeatStatusBar remaining={remaining} isOpen={isOpen} />
        </div>
      </section>

      <Section variant="white" className="py-16 md:py-20">
        <EventSchedule />
      </Section>

      <Section variant="canvas" className="py-16 md:py-20">
        <div className="mx-auto max-w-xl">
          <SectionTitle as="h2">{t('heroTitle')}</SectionTitle>
          <RegistrationForm
            isOpen={isOpen}
            remaining={remaining}
            feePerPerson={feePerPerson}
            clientKey={clientKey}
          />
        </div>
      </Section>

      <Section variant="white" className="py-16 md:py-20">
        <EventFAQ />
      </Section>
    </main>
  );
}
