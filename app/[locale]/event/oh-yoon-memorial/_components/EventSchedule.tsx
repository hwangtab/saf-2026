import { getTranslations } from 'next-intl/server';
import { CalendarDays, MapPin, Bus, Ticket } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
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

        {/* 행사 포스터 — 행사 전체를 한눈에 보여주는 비주얼 */}
        <div className="mx-auto mt-8 max-w-sm">
          <SafeImage
            src="/images/oh-yoon-memorial-poster.png"
            alt={t('posterAlt')}
            width={1080}
            height={1350}
            className="w-full rounded-2xl border border-gallery-hairline shadow-lg"
          />
        </div>

        {/* 핵심 정보 카드 */}
        <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gallery-hairline bg-gallery-hairline sm:grid-cols-2">
          {info.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white p-5">
              <dt className="flex items-center gap-3 text-eyebrow text-charcoal-muted">
                <Icon className="h-5 w-5 shrink-0 text-primary-strong" aria-hidden="true" />
                <span>{label}</span>
              </dt>
              <dd className="mt-1 pl-8 font-semibold text-charcoal-deep break-keep">{value}</dd>
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
