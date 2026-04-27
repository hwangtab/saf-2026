'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { exportSignaturesCsv, type CsvExportMode } from '@/app/actions/petition-admin';

export default function CsvDownloadButtons() {
  const t = useTranslations('admin.petition');
  const [pending, startTransition] = useTransition();
  const [busyMode, setBusyMode] = useState<CsvExportMode | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const modes: { mode: CsvExportMode; labelKey: string; tone: 'primary' | 'secondary' }[] = [
    { mode: 'full', labelKey: 'csvFull', tone: 'primary' },
    { mode: 'masked', labelKey: 'csvMasked', tone: 'secondary' },
    { mode: 'committee', labelKey: 'csvCommittee', tone: 'secondary' },
  ];

  function downloadCsv(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleClick(mode: CsvExportMode) {
    setBusyMode(mode);
    setMsg(null);
    startTransition(async () => {
      const result = await exportSignaturesCsv(mode);
      setBusyMode(null);
      if (!result.ok || !result.csv || !result.filename) {
        setMsg(result.message ?? t('csvFailed'));
        return;
      }
      downloadCsv(result.filename, result.csv);
      setMsg(t('csvDownloaded', { count: (result.rowCount ?? 0).toLocaleString('ko-KR') }));
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.mode}
            type="button"
            onClick={() => handleClick(m.mode)}
            disabled={pending}
            className={
              m.tone === 'primary'
                ? 'rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-primary-strong disabled:opacity-60'
                : 'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep hover:bg-gray-50 disabled:opacity-60'
            }
          >
            {pending && busyMode === m.mode ? t('csvGenerating') : t(m.labelKey)}
          </button>
        ))}
      </div>
      {msg && (
        <p role="status" className="text-xs text-charcoal-muted">
          {msg}
        </p>
      )}
    </div>
  );
}
