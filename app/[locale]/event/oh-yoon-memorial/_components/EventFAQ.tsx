import { getTranslations } from 'next-intl/server';

const FAQ_KEYS = [
  { q: 'faqQ1', a: 'faqA1' },
  { q: 'faqQ2', a: 'faqA2' },
  { q: 'faqQ3', a: 'faqA3' },
] as const;

export default async function EventFAQ() {
  const t = await getTranslations('event.ohYoonMemorial');
  return (
    <div className="container-max">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-6 text-center font-display text-2xl font-bold text-charcoal-deep md:text-3xl">
          {t('faqTitle')}
        </h2>
        <dl className="divide-y divide-gallery-divider overflow-hidden rounded-2xl border border-gallery-hairline bg-white">
          {FAQ_KEYS.map(({ q, a }) => (
            <div key={q} className="p-5 md:p-6">
              <dt className="font-semibold text-charcoal-deep break-keep">{t(q)}</dt>
              <dd className="mt-1.5 break-keep text-charcoal-muted">{t(a)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
