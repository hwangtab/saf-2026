import { getTranslations } from 'next-intl/server';

/** 추도식의 의의 — 추도객의 마음을 움직이는 경건한 헌사. */
export default async function EventMeaning() {
  const t = await getTranslations('event.ohYoonMemorial');
  return (
    <div className="container-max">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-eyebrow text-primary-strong">{t('meaningEyebrow')}</p>
        <h2 className="mt-3 whitespace-pre-line font-display text-3xl font-black leading-tight text-charcoal-deep break-keep md:text-4xl">
          {t('meaningTitle')}
        </h2>
        <div className="mx-auto mt-7 max-w-prose space-y-5 text-left text-base leading-relaxed text-charcoal break-keep md:text-lg">
          <p>{t('meaningP1')}</p>
          <p>{t('meaningP2')}</p>
        </div>
      </div>
    </div>
  );
}
