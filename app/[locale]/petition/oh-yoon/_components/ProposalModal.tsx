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
        className="text-sm font-medium text-charcoal-muted underline underline-offset-4 decoration-gray-300 hover:text-primary-strong hover:decoration-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
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
            <p>{t('proposalSection2Body1')}</p>
            <p>{t('proposalSection2Body2')}</p>
            <p>{t('proposalSection2Body3')}</p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-xl text-charcoal-deep">
              {t('proposalSection3Heading')}
            </h3>
            <p>{t('proposalSection3Step1')}</p>
            <p>{t('proposalSection3Step2')}</p>
            <p>{t('proposalSection3Step3')}</p>
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
