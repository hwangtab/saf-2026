import { getTranslations } from 'next-intl/server';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import Section from '@/components/ui/Section';
import { LOAN_COUNT } from '@/lib/site-stats';

interface Props {
  locale: string;
}

export default async function MechanismSection({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'home.mechanism' });

  const steps = [
    { label: t('step1.label'), note: t('step1.note') },
    { label: t('step2.label'), note: t('step2.note') },
    { label: t('step3.label'), note: t('step3.note') },
    { label: t('step4.label'), note: t('step4.note') },
  ];

  return (
    <Section variant="canvas" padding="none">
      <div className="container-max py-12 md:py-16 px-4 sm:px-6">
        <h2 className="text-2xl md:text-3xl font-bold text-charcoal-deep text-center mb-10 break-keep">
          {t('title')}
        </h2>

        {/* 4-step flow */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-2 mb-10">
          {steps.map((step, i) => (
            <div key={step.label} className="flex md:flex-row flex-col items-center gap-2 md:gap-2">
              <div
                className={`flex flex-col items-center rounded-2xl px-6 py-4 shadow-sm w-44 md:w-auto ${
                  i === 3 ? 'bg-primary-strong text-white' : 'bg-white border border-gray-100'
                }`}
              >
                <span
                  className={`text-xs font-semibold tracking-wider uppercase mb-1 ${
                    i === 3 ? 'text-white/80' : 'text-primary-strong'
                  }`}
                >
                  {step.note}
                </span>
                <span
                  className={`text-sm font-bold ${i === 3 ? 'text-white' : 'text-charcoal-deep'}`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight
                  aria-hidden="true"
                  className="hidden md:block h-5 w-5 text-charcoal-soft flex-shrink-0"
                />
              )}
            </div>
          ))}
        </div>

        {/* Live counter */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
          <div className="flex flex-col items-center bg-canvas-strong border border-gray-200 rounded-2xl px-8 py-5 min-w-[140px]">
            <span className="text-xs text-charcoal-muted uppercase tracking-widest mb-1">
              {t('counter.loansLabel')}
            </span>
            <span className="text-3xl font-black text-charcoal-deep tabular-nums">
              {t('counter.loansValue', { loanCount: LOAN_COUNT })}
            </span>
          </div>
          <div className="flex flex-col items-center bg-canvas-strong border border-gray-200 rounded-2xl px-8 py-5 min-w-[140px]">
            <span className="text-xs text-charcoal-muted uppercase tracking-widest mb-1">
              {t('counter.repaymentLabel')}
            </span>
            <span className="text-3xl font-black text-charcoal-deep tabular-nums">
              {t('counter.repaymentValue')}
            </span>
          </div>
        </div>

        {/* Message + CTA */}
        <p className="text-center text-charcoal font-medium mb-4 break-keep">{t('message')}</p>
        <div className="text-center">
          <Link
            href="/our-proof"
            className="inline-flex items-center gap-1 text-sm text-charcoal-muted hover:text-primary transition-colors border-b border-charcoal-muted/30 hover:border-primary pb-0.5"
          >
            {t('cta')}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Section>
  );
}
