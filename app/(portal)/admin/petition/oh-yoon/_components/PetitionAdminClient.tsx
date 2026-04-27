'use client';

import { useState } from 'react';
import clsx from 'clsx';

import KpiBar from './KpiBar';
import OverviewTab from './OverviewTab';
import MessagesTab from './MessagesTab';
import CommitteeTab from './CommitteeTab';
import AuditLogTab from './AuditLogTab';
import MailTab from './MailTab';
import type { AdminBootstrap } from './types';

type TabKey = 'overview' | 'messages' | 'committee' | 'mail' | 'audit';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '개요' },
  { key: 'messages', label: '메시지' },
  { key: 'committee', label: '추진위원' },
  { key: 'mail', label: '메일 발송' },
  { key: 'audit', label: '감사 로그' },
];

export default function PetitionAdminClient({ bootstrap }: { bootstrap: AdminBootstrap }) {
  const [tab, setTab] = useState<TabKey>('overview');

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal-deep">
          오윤 구의동 벽화 시민 청원 — 운영
        </h1>
        <p className="text-sm text-charcoal-muted break-keep">
          PRD §10.7 기준 5탭. 모든 변경 행위는 감사 로그에 자동 기록됩니다.
        </p>
      </header>

      <KpiBar counts={bootstrap.counts} />

      {/* 탭 */}
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                'px-4 py-2 text-sm font-semibold transition-colors',
                'border-b-2 -mb-px',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal-deep'
              )}
            >
              {t.label}
              {t.key === 'messages' && bootstrap.messages.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary-surface px-1.5 py-0.5 text-xs font-medium text-primary-strong">
                  {bootstrap.messages.length}
                </span>
              )}
              {t.key === 'committee' && bootstrap.committee.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary-surface px-1.5 py-0.5 text-xs font-medium text-primary-strong">
                  {bootstrap.committee.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 탭 본문 */}
      <div className="min-h-[300px]">
        {tab === 'overview' && (
          <OverviewTab counts={bootstrap.counts} regionBreakdown={bootstrap.regionBreakdown} />
        )}
        {tab === 'messages' && <MessagesTab messages={bootstrap.messages} />}
        {tab === 'committee' && <CommitteeTab committee={bootstrap.committee} />}
        {tab === 'mail' && <MailTab counts={bootstrap.counts} />}
        {tab === 'audit' && <AuditLogTab audit={bootstrap.audit} />}
      </div>
    </div>
  );
}
