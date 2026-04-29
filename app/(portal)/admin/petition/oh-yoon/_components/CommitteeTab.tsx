'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { getRegionByKey } from '@/lib/petition/regions';

import type { AdminCommitteeRow } from './types';

interface CommitteeTabProps {
  committee: AdminCommitteeRow[];
}

export default function CommitteeTab({ committee }: CommitteeTabProps) {
  const t = useTranslations('admin.petition');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return committee;
    return committee.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
    );
  }, [committee, search]);

  const declarationText = useMemo(() => committee.map((c) => c.full_name).join(', '), [committee]);

  const [copied, setCopied] = useState(false);

  function copyDeclaration() {
    void navigator.clipboard.writeText(declarationText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-charcoal-muted">
          {t('committeeCountLine', { count: committee.length.toLocaleString('ko-KR') })}
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('committeeSearchPlaceholder')}
          className="w-full sm:w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </header>

      <section className="rounded-lg border border-gray-200 bg-canvas p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-charcoal-deep">
            {t('committeeDeclarationHeading')}
          </h2>
          <button
            type="button"
            onClick={copyDeclaration}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-charcoal-deep hover:bg-gray-50"
          >
            {copied ? t('committeeCopied') : t('committeeCopy')}
          </button>
        </div>
        <p className="text-sm text-charcoal whitespace-pre-wrap break-keep max-h-32 overflow-auto">
          {declarationText || t('committeeDeclarationEmpty')}
        </p>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-charcoal-muted">
          {t('committeeEmpty')}
        </p>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-charcoal-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColName')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColEmail')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColPhone')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColRegion')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColSignedAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((c) => {
                const region =
                  (getRegionByKey(c.region_top)?.label ?? c.region_top) +
                  (c.region_sub ? ` · ${c.region_sub}` : '');
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-charcoal-deep font-medium">{c.full_name}</td>
                    <td className="px-3 py-2 text-charcoal-muted">{c.email}</td>
                    <td className="px-3 py-2 text-charcoal-muted tabular-nums">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:underline">
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-charcoal-muted">{region}</td>
                    <td className="px-3 py-2 text-charcoal-muted tabular-nums">
                      {new Date(c.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-charcoal-muted break-keep">{t('committeeFooter')}</p>
    </div>
  );
}
