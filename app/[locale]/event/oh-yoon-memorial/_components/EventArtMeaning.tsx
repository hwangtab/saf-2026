import { getTranslations } from 'next-intl/server';

/** 오윤 작업의 민중적·예술적 의의 — 3가지 기둥으로 종합. */
export default async function EventArtMeaning() {
  const t = await getTranslations('event.ohYoonMemorial');
  const pillars = [
    { title: t('artMeaning1Title'), body: t('artMeaning1Body') },
    { title: t('artMeaning2Title'), body: t('artMeaning2Body') },
    { title: t('artMeaning3Title'), body: t('artMeaning3Body') },
  ];
  return (
    <div className="container-max">
      <div className="mx-auto max-w-5xl">
        <p className="text-eyebrow text-primary-strong">{t('artMeaningEyebrow')}</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-charcoal-deep break-keep md:text-3xl">
          {t('artMeaningTitle')}
        </h2>

        <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {pillars.map((p, i) => (
            <li key={p.title} className="border-t-2 border-primary-strong/30 pt-5">
              <span className="font-display text-3xl font-black text-primary-strong/40 tabular-nums">
                0{i + 1}
              </span>
              <h3 className="mt-2 font-display text-lg font-bold text-charcoal-deep break-keep">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal break-keep md:text-base">
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
