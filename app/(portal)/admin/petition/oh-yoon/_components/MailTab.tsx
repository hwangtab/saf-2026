'use client';

import { useTranslations } from 'next-intl';
import type { AdminCounts } from './types';

interface MailTabProps {
  counts: AdminCounts;
}

/**
 * v1에서는 영수증 메일만 자동 발송 (서명 직후, fire-and-forget).
 * 일괄 발송 UI는 v2 (PRD §10.7.6).
 */
export default function MailTab({ counts }: MailTabProps) {
  const t = useTranslations('admin.petition');
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-charcoal-deep mb-2">{t('mailAutoHeading')}</h2>
        <ul className="space-y-1 text-sm text-charcoal break-keep">
          <li>· {renderBold(t('mailAutoReceipt'))}</li>
          <li>· {renderBold(t('mailAutoMilestone'))}</li>
        </ul>
      </section>

      <section className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <h2 className="font-semibold text-charcoal-deep mb-2">{t('mailV2Heading')}</h2>
        <p className="text-sm text-charcoal-muted break-keep mb-3">{t('mailV2Body')}</p>
        <ul className="space-y-1 text-sm text-charcoal-muted break-keep">
          <li>
            ·{' '}
            {t('mailV2D1', {
              count: counts.total.toLocaleString('ko-KR'),
            })}
          </li>
          <li>· {t('mailV2Result')}</li>
          <li>
            ·{' '}
            {t('mailV2Committee', {
              count: counts.committee_total.toLocaleString('ko-KR'),
            })}
          </li>
        </ul>
      </section>

      <p className="text-xs text-charcoal-muted break-keep">{t('mailAuditNote')}</p>
    </div>
  );
}

/** **bold** 마크다운식 표기 → strong 태그로 변환 */
function renderBold(input: string) {
  const parts = input.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
