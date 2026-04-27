'use client';

import { useState, useTransition } from 'react';

import { exportSignaturesCsv, type CsvExportMode } from '@/app/actions/petition-admin';

const MODES: { mode: CsvExportMode; label: string; tone: 'primary' | 'secondary' }[] = [
  { mode: 'full', label: '전체 PII (관리자 전용)', tone: 'primary' },
  { mode: 'masked', label: '마스킹 (보도자료·통계)', tone: 'secondary' },
  { mode: 'committee', label: '추진위원 명단', tone: 'secondary' },
];

export default function CsvDownloadButtons() {
  const [pending, startTransition] = useTransition();
  const [busyMode, setBusyMode] = useState<CsvExportMode | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
        setMsg(result.message ?? '실패');
        return;
      }
      downloadCsv(result.filename, result.csv);
      setMsg(`${result.rowCount?.toLocaleString('ko-KR') ?? 0}건 다운로드 — 감사 로그 기록됨`);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
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
            {pending && busyMode === m.mode ? '생성 중…' : m.label}
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
