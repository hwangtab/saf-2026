'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/ui/Modal';

export default function ProposalModal() {
  const t = useTranslations('petition.ohYoon');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-charcoal/20 bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep hover:border-primary hover:text-primary-strong transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <svg
          aria-hidden="true"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {t('faqProposalLink')}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('proposalDocTitle')}
        className="max-w-3xl"
      >
        <article className="space-y-8 text-base leading-relaxed text-charcoal break-keep">
          <p className="text-sm text-charcoal-muted">{t('proposalDocSubtitle')}</p>

          <section className="space-y-3">
            <h3 className="font-display text-xl text-charcoal-deep">
              {t('proposalSection1Heading')}
            </h3>
            <p>{t('proposalSection1Body1')}</p>
            <p>{t('proposalSection1Body2')}</p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-xl text-charcoal-deep">
              {t('proposalSection2Heading')}
            </h3>
            {/* (가)/(나)/(다) marker가 본문에 박혀 있어 줄바꿈 시 hanging indent 적용 */}
            <p className="pl-[1.75rem] [text-indent:-1.75rem]">{t('proposalSection2Body1')}</p>
            <p className="pl-[1.75rem] [text-indent:-1.75rem]">{t('proposalSection2Body2')}</p>
            <p className="pl-[1.75rem] [text-indent:-1.75rem]">{t('proposalSection2Body3')}</p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-xl text-charcoal-deep">
              {t('proposalSection3Heading')}
            </h3>
            {/* (1)/(2)/(3) marker hanging indent */}
            <p className="pl-[1.75rem] [text-indent:-1.75rem]">{t('proposalSection3Step1')}</p>
            <p className="pl-[1.75rem] [text-indent:-1.75rem]">{t('proposalSection3Step2')}</p>
            <p className="pl-[1.75rem] [text-indent:-1.75rem]">{t('proposalSection3Step3')}</p>
            <p className="pt-2">{t('proposalSection3Summary')}</p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-xl text-charcoal-deep">
              {t('proposalSection4Heading')}
            </h3>
            <p className="rounded-xl bg-canvas border border-primary/20 p-4 font-bold text-charcoal-deep">
              {t('proposalSection4Body')}
            </p>
          </section>

          <section className="space-y-1 pt-2 border-t border-gray-100">
            <h3 className="font-display text-xl text-charcoal-deep mb-3">
              {t('proposalSection5Heading')}
            </h3>
            <p>{t('proposalSection5Line1')}</p>
            <p>{t('proposalSection5Line2')}</p>
            <p>{t('proposalSection5Line3')}</p>
            <p className="text-charcoal-muted">{t('proposalSection5Line4')}</p>
          </section>
        </article>
      </Modal>
    </>
  );
}
