'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Lock, Mail } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { CONTACT } from '@/lib/constants';

export default function CheckoutTrustNotice() {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const isEn = locale === 'en';

  const seller = t('sellerInfo', {
    org: isEn ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    rep: isEn ? CONTACT.REPRESENTATIVE_NAME_EN : CONTACT.REPRESENTATIVE_NAME,
    bizNo: CONTACT.BUSINESS_REGISTRATION_NUMBER,
    mailOrder: isEn ? CONTACT.MAIL_ORDER_REPORT_NUMBER_EN : CONTACT.MAIL_ORDER_REPORT_NUMBER,
    phone: CONTACT.PHONE,
  });

  return (
    <div className="mt-6 space-y-4 text-sm text-charcoal-soft">
      <ul className="space-y-2">
        <li className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{t('noticeSafePayment')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{t('noticeAfterPayment')}</span>
        </li>
      </ul>

      <p className="border-t border-gray-100 pt-4 text-xs leading-relaxed text-charcoal-soft">
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

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-1 text-xs font-medium text-charcoal-muted">{t('sellerInfoLabel')}</p>
        <p className="text-xs leading-relaxed text-charcoal-soft">{seller}</p>
      </div>
    </div>
  );
}
