import { getTranslations } from 'next-intl/server';
import { OH_YOON_MEMORIAL_SCHEDULE } from '@/content/events/oh-yoon-memorial';

export default async function EventSchedule() {
  const t = await getTranslations('event.ohYoonMemorial');
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="mb-6 font-display text-2xl font-bold text-charcoal-deep">
        {t('scheduleTitle')}
      </h2>
      <ol className="space-y-3">
        {OH_YOON_MEMORIAL_SCHEDULE.map((s) => (
          <li key={s.key} className="flex gap-4">
            <span className="font-semibold tabular-nums text-primary-strong">{s.time}</span>
            <span className="text-charcoal">{t(`schedule.${s.key}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
