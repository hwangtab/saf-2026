import { getTranslations } from 'next-intl/server';

const FAQ_KEYS = [
  { q: 'faqQ1', a: 'faqA1' },
  { q: 'faqQ2', a: 'faqA2' },
  { q: 'faqQ3', a: 'faqA3' },
] as const;

export default async function EventFAQ() {
  const t = await getTranslations('event.ohYoonMemorial');
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="mb-6 font-display text-2xl font-bold text-charcoal-deep">{t('faqTitle')}</h2>
      <dl className="space-y-5">
        {FAQ_KEYS.map(({ q, a }) => (
          <div key={q}>
            <dt className="font-semibold text-charcoal-deep">{t(q)}</dt>
            <dd className="mt-1.5 break-keep text-charcoal-muted">{t(a)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
