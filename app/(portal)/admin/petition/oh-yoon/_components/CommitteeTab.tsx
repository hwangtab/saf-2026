'use client';

import { useMemo, useState } from 'react';

import { getRegionByKey } from '@/lib/petition/regions';

import type { AdminCommitteeRow } from './types';

interface CommitteeTabProps {
  committee: AdminCommitteeRow[];
}

export default function CommitteeTab({ committee }: CommitteeTabProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return committee;
    return committee.filter(
      (c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [committee, search]);

  // 발족 선언문용 — 가나다순 콤마 구분 텍스트
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
          전체 {committee.length.toLocaleString('ko-KR')}명 (가나다순)
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름/이메일 검색"
          className="w-full sm:w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </header>

      {/* 발족 선언문용 텍스트 자동 생성 */}
      <section className="rounded-lg border border-gray-200 bg-canvas-soft p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-charcoal-deep">
            발족 선언문용 명단 (가나다순)
          </h2>
          <button
            type="button"
            onClick={copyDeclaration}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-charcoal-deep hover:bg-gray-50"
          >
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
        <p className="text-sm text-charcoal whitespace-pre-wrap break-keep max-h-32 overflow-auto">
          {declarationText || '(아직 추진위원 신청자가 없습니다)'}
        </p>
      </section>

      {/* 명단 표 */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-charcoal-muted">
          조건에 맞는 추진위원이 없습니다.
        </p>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-charcoal-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">이름</th>
                <th className="px-3 py-2.5 font-semibold">이메일</th>
                <th className="px-3 py-2.5 font-semibold">지역</th>
                <th className="px-3 py-2.5 font-semibold">서명일</th>
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

      <p className="text-xs text-charcoal-muted break-keep">
        추진위원 명단은 청원 결과 발표 시 발족 선언문에 게재됩니다. CSV는 «개요» 탭에서 받으세요.
      </p>
    </div>
  );
}
