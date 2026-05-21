'use client';

import { useLocale, useTranslations } from 'next-intl';
import { PackageCheck, Lock, BadgeCheck, RotateCcw, Headphones, Sprout } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { CONTACT } from '@/lib/constants';

export default function CheckoutTrustNotice() {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const isEn = locale === 'en';

  const steps = [t('afterStep1'), t('afterStep2'), t('afterStep3'), t('afterStep4')];

  const seller = t('sellerInfo', {
    org: isEn ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    rep: isEn ? CONTACT.REPRESENTATIVE_NAME_EN : CONTACT.REPRESENTATIVE_NAME,
    bizNo: CONTACT.BUSINESS_REGISTRATION_NUMBER,
    mailOrder: isEn ? CONTACT.MAIL_ORDER_REPORT_NUMBER_EN : CONTACT.MAIL_ORDER_REPORT_NUMBER,
    phone: CONTACT.PHONE,
  });

  const iconClass = 'mt-0.5 h-4 w-4 shrink-0 text-primary';

  return (
    <div className="mt-6 space-y-5">
      {/* 친절 안내 패널 */}
      <div className="space-y-5 rounded-2xl border border-gray-100 bg-canvas-strong p-5">
        {/* ① 결제 후 진행 단계 */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-charcoal">
            <PackageCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('afterPaymentTitle')}
          </h3>
          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-charcoal-muted">
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary-a11y"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* ② 안심 포인트 */}
        <div className="border-t border-gray-100 pt-5">
          <h3 className="mb-3 text-sm font-semibold text-charcoal">{t('assureTitle')}</h3>
          <ul className="space-y-2.5 text-sm text-charcoal-muted">
            <li className="flex items-start gap-2.5">
              <Lock className={iconClass} aria-hidden="true" />
              <span>{t('assureSafePay')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <BadgeCheck className={iconClass} aria-hidden="true" />
              <span>{t('assureCert')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <RotateCcw className={iconClass} aria-hidden="true" />
              <span>{t('assureReturn')}</span>
            </li>
          </ul>
        </div>

        {/* ③ 고객지원 */}
        <div className="border-t border-gray-100 pt-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-charcoal">
            <Headphones className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('supportTitle')}
          </p>
          <p className="mt-1.5 text-sm text-charcoal-muted">{t('supportBody')}</p>
          <p className="mt-1.5 text-sm font-medium text-charcoal">
            {t('supportContact', { phone: CONTACT.PHONE, email: CONTACT.EMAIL })}
          </p>
        </div>
      </div>

      {/* ④ 캠페인 의미 */}
      <div className="rounded-2xl bg-sun-soft px-5 py-4">
        <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-charcoal">
          <Sprout className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('purchaseMeaning')}</span>
        </p>
      </div>

      {/* ⑤ 동의 고지 */}
      <p className="text-xs leading-relaxed text-charcoal-soft">
        {t.rich('agreeNotice', {
          terms: (c) => (
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              {c}
            </Link>
          ),
          privacy: (c) => (
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              {c}
            </Link>
          ),
          refund: (c) => (
            <Link
              href="/refund-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              {c}
            </Link>
          ),
        })}
      </p>

      {/* ⑥ 판매자 정보 */}
      <div className="border-t border-gray-100 pt-4">
        <p className="mb-1 text-xs font-medium text-charcoal-muted">{t('sellerInfoLabel')}</p>
        <p className="text-xs leading-relaxed text-charcoal-soft">{seller}</p>
      </div>
    </div>
  );
}
