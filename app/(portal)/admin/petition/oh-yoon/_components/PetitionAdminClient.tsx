'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import KpiBar from './KpiBar';
import OverviewTab from './OverviewTab';
import MessagesTab from './MessagesTab';
import CommitteeTab from './CommitteeTab';
import SignaturesTab from './SignaturesTab';
import AuditLogTab from './AuditLogTab';
import MailTab from './MailTab';
import type { AdminBootstrap } from './types';

type TabKey = 'overview' | 'signatures' | 'messages' | 'committee' | 'mail' | 'audit';

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'overview', labelKey: 'tabOverview' },
  { key: 'signatures', labelKey: 'tabSignatures' },
  { key: 'messages', labelKey: 'tabMessages' },
  { key: 'committee', labelKey: 'tabCommittee' },
  { key: 'mail', labelKey: 'tabMail' },
  { key: 'audit', labelKey: 'tabAudit' },
];

export default function PetitionAdminClient({ bootstrap }: { bootstrap: AdminBootstrap }) {
  const t = useTranslations('admin.petition');
  const [tab, setTab] = useState<TabKey>('overview');

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal-deep">{t('pageTitle')}</h1>
        <p className="text-sm text-charcoal-muted break-keep">{t('pageDescription')}</p>
      </header>

      <KpiBar counts={bootstrap.counts} />

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((tab_) => {
          const active = tab === tab_.key;
          return (
            <button
              key={tab_.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(tab_.key)}
              className={clsx(
                'px-4 py-2 text-sm font-semibold transition-colors',
                'border-b-2 -mb-px',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal-deep'
              )}
            >
              {t(tab_.labelKey)}
              {tab_.key === 'signatures' && bootstrap.counts.total > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary-surface px-1.5 py-0.5 text-xs font-medium text-primary-strong">
                  {bootstrap.counts.total.toLocaleString('ko-KR')}
                </span>
              )}
              {tab_.key === 'messages' && bootstrap.messagesTotal > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary-surface px-1.5 py-0.5 text-xs font-medium text-primary-strong">
                  {bootstrap.messagesTotal.toLocaleString('ko-KR')}
                </span>
              )}
              {tab_.key === 'committee' && bootstrap.counts.committee_total > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary-surface px-1.5 py-0.5 text-xs font-medium text-primary-strong">
                  {bootstrap.counts.committee_total.toLocaleString('ko-KR')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-[300px]">
        {tab === 'overview' && (
          <OverviewTab counts={bootstrap.counts} regionBreakdown={bootstrap.regionBreakdown} />
        )}
        {tab === 'signatures' && <SignaturesTab signaturesTotal={bootstrap.counts.total} />}
        {tab === 'messages' && <MessagesTab />}
        {tab === 'committee' && <CommitteeTab committeeTotal={bootstrap.counts.committee_total} />}
        {tab === 'mail' && <MailTab counts={bootstrap.counts} />}
        {tab === 'audit' && <AuditLogTab audit={bootstrap.audit} />}
      </div>
    </div>
  );
}
