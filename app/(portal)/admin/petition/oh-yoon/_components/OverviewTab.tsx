'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { forceCloseCampaign, reopenCampaign } from '@/app/actions/petition-admin';
import { getRegionByKey } from '@/lib/petition/regions';

import type { AdminCounts, AdminRegionRow } from './types';
import CsvDownloadButtons from './CsvDownloadButtons';

interface OverviewTabProps {
  counts: AdminCounts;
  regionBreakdown: AdminRegionRow[];
}

export default function OverviewTab({ counts, regionBreakdown }: OverviewTabProps) {
  const t = useTranslations('admin.petition');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const max = regionBreakdown[0]?.count ?? 1;

  function handleClose() {
    if (!confirm(t('overviewForceCloseConfirm'))) return;
    startTransition(async () => {
      const r = await forceCloseCampaign();
      setMsg(r.message ?? (r.ok ? t('overviewCloseSuccess') : t('overviewActionFailed')));
    });
  }
  function handleReopen() {
    if (!confirm(t('overviewReopenConfirm'))) return;
    startTransition(async () => {
      const r = await reopenCampaign();
      setMsg(r.message ?? (r.ok ? t('overviewReopenSuccess') : t('overviewActionFailed')));
    });
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-charcoal-deep mb-3">
          {t('overviewRegionHeading')}
        </h2>
        {regionBreakdown.length === 0 ? (
          <p className="text-sm text-charcoal-muted">{t('overviewRegionEmpty')}</p>
        ) : (
          <ul className="space-y-1.5">
            {regionBreakdown.map((r) => {
              const label = getRegionByKey(r.region_top)?.label ?? r.region_top;
              const ratio = (r.count / max) * 100;
              return (
                <li
                  key={r.region_top}
                  className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3 text-sm"
                >
                  <span className="text-charcoal-deep">{label}</span>
                  <span className="relative h-5 rounded-full bg-gray-100 overflow-hidden">
                    <span
                      className="absolute left-0 top-0 h-full bg-primary/80"
                      style={{ width: `${ratio}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-charcoal-muted">
                    {r.count.toLocaleString('ko-KR')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal-deep mb-3">
          {t('overviewExportHeading')}
        </h2>
        <CsvDownloadButtons />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal-deep mb-3">
          {t('overviewControlHeading')}
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          {counts.is_active ? (
            <button
              type="button"
              onClick={handleClose}
              disabled={pending}
              className="rounded-lg border border-danger/40 bg-white px-4 py-2 text-sm font-semibold text-danger-a11y hover:bg-danger/10 disabled:opacity-60"
            >
              {t('overviewForceClose')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReopen}
              disabled={pending}
              className="rounded-lg border border-primary/40 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-surface disabled:opacity-60"
            >
              {t('overviewReopen')}
            </button>
          )}
          {msg && (
            <span role="status" className="text-sm text-charcoal-muted">
              {msg}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-charcoal-muted break-keep">{t('overviewCronNote')}</p>
      </section>
    </div>
  );
}
