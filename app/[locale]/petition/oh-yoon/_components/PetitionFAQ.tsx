'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface FaqItem {
  q: string;
  a: string;
}

export default function PetitionFAQ() {
  const t = useTranslations('petition.ohYoon');
  const items: FaqItem[] = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-gray-200 border-y border-gray-200">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const panelId = `petition-faq-panel-${i}`;
        const buttonId = `petition-faq-button-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left text-lg font-semibold text-charcoal-deep hover:text-primary-strong transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  className={`text-2xl transition-transform ${isOpen ? 'rotate-45' : ''}`}
                >
                  +
                </span>
              </button>
            </h3>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="pb-5 text-base text-charcoal leading-relaxed"
              >
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
