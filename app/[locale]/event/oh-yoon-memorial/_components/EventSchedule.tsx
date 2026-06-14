import { getTranslations } from 'next-intl/server';
import { CalendarDays, MapPin, Bus, Ticket } from 'lucide-react';
import { OH_YOON_MEMORIAL_SCHEDULE } from '@/content/events/oh-yoon-memorial';

/** 추도식 안내 — 핵심 정보 카드 + 당일 일정 타임라인. */
export default async function EventSchedule() {
  const t = await getTranslations('event.ohYoonMemorial');

  const info = [
    { icon: CalendarDays, label: t('infoDateLabel'), value: t('infoDateValue') },
    { icon: MapPin, label: t('infoMeetLabel'), value: t('infoMeetValue') },
    { icon: Bus, label: t('infoBusLabel'), value: t('infoBusValue') },
    { icon: Ticket, label: t('infoFeeLabel'), value: t('infoFeeValue') },
  ];

  return (
    <div className="container-max">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center font-display text-2xl font-bold text-charcoal-deep md:text-3xl">
          {t('infoTitle')}
        </h2>

        {/* 핵심 정보 카드 */}
        <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gallery-hairline bg-gallery-hairline sm:grid-cols-2">
          {info.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 bg-white p-5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" aria-hidden="true" />
              <div>
                <dt className="text-eyebrow text-charcoal-muted">{label}</dt>
                <dd className="mt-0.5 font-semibold text-charcoal-deep break-keep">{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        {/* 당일 일정 타임라인 */}
        <ol className="mt-8">
          {OH_YOON_MEMORIAL_SCHEDULE.map((s, i) => (
            <li key={s.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="mt-2 flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary-strong" />
                {i < OH_YOON_MEMORIAL_SCHEDULE.length - 1 && (
                  <span className="my-1 w-px flex-1 bg-gallery-hairline" />
                )}
              </div>
              <div className="pb-6">
                <span className="font-display font-bold tabular-nums text-primary-strong">
                  {s.time}
                </span>
                <p className="text-charcoal break-keep">{t(`schedule.${s.key}`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
