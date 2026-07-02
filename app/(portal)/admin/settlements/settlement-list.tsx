'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdminCard,
  AdminCardHeader,
  AdminSelect,
  AdminBadge,
  AdminEmptyState,
} from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/(portal)/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
import { markSettlementPaid, unmarkSettlementPaid } from '@/app/actions/admin-settlements';
import type { MonthlySettlements, SettlementRow } from '@/lib/settlements/compute';

function formatKRW(amount: number) {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

export function SettlementList({ data }: { data: MonthlySettlements }) {
  const router = useRouter();
  const toast = useToast();
  const [payTarget, setPayTarget] = useState<SettlementRow | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isPending, startTransition] = useTransition();

  function onMonthChange(month: string) {
    router.push(`/admin/settlements?month=${encodeURIComponent(month)}`);
  }

  function openPay(row: SettlementRow) {
    setPayTarget(row);
    setPaidAmountInput(String(row.share));
    setNoteInput('');
  }

  function handleMarkPaid() {
    if (!payTarget || payTarget.artistId == null) return;
    const artistId = payTarget.artistId;
    const parsed = paidAmountInput.trim() === '' ? null : Number(paidAmountInput.replace(/,/g, ''));
    if (parsed != null && (Number.isNaN(parsed) || parsed < 0)) {
      toast.error('실지급액은 0 이상의 숫자여야 합니다.');
      return;
    }
    startTransition(async () => {
      const res = await markSettlementPaid(artistId, data.month, parsed, noteInput.trim() || null);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success('지급 완료로 기록했습니다.');
      setPayTarget(null);
      router.refresh();
    });
  }

  function handleUnmark(row: SettlementRow) {
    if (row.artistId == null) return;
    const artistId = row.artistId;
    startTransition(async () => {
      const res = await unmarkSettlementPaid(artistId, data.month);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success('지급 기록을 취소했습니다.');
      router.refresh();
    });
  }

  return (
    <AdminCard>
      <AdminCardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AdminSelect
              value={data.month}
              onChange={(e) => onMonthChange(e.target.value)}
              className="w-full sm:w-48"
            >
              {data.availableMonths.length === 0 && <option value="">데이터 없음</option>}
              {data.availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </AdminSelect>
            {data.month && (
              <a
                href={`/admin/settlements/export?month=${encodeURIComponent(data.month)}`}
                className="whitespace-nowrap rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-gray-50"
              >
                CSV 다운로드
              </a>
            )}
          </div>
          <p className="text-sm text-gray-500">
            판매액 {formatKRW(data.totals.gross)} · 정산예정 {formatKRW(data.totals.share)} ·
            지급완료 {data.totals.paidCount}/{data.totals.artistCount}
          </p>
        </div>
      </AdminCardHeader>

      <div className="border-b border-[var(--admin-border-soft)] bg-charcoal-deep/5 px-4 py-3 text-xs text-charcoal-muted">
        표시 금액은 실비(결제수수료·배송비·포장비) 공제 전 <strong>판매액의 50%</strong> 기준입니다.
        실지급 시 실비 차감 후 실지급액과 메모를 기록하세요.
      </div>

      {data.rows.length === 0 ? (
        <AdminEmptyState title="매출 없음" description="이 달에는 정산할 매출이 없습니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border-soft)] text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">작가</th>
                <th className="px-4 py-3 text-right">판매수량</th>
                <th className="px-4 py-3 text-right">판매액</th>
                <th className="px-4 py-3 text-right">정산예정(50%)</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3 text-right">실지급액</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border-soft)]">
              {data.rows.map((row) => (
                <tr key={row.artistId ?? 'unassigned'} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{row.artistName}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.soldCount}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{formatKRW(row.gross)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatKRW(row.share)}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={row.status === 'paid' ? 'success' : 'default'}>
                      {row.status === 'paid' ? '지급완료' : '미지급'}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {row.paidAmount != null ? formatKRW(row.paidAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!row.payable ? (
                      <span className="text-xs text-gray-400">지급 불가</span>
                    ) : row.status === 'paid' ? (
                      <button
                        type="button"
                        onClick={() => handleUnmark(row)}
                        disabled={isPending}
                        className="text-xs text-charcoal-muted hover:underline disabled:opacity-50"
                      >
                        지급 취소
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openPay(row)}
                        disabled={isPending}
                        className="whitespace-nowrap rounded-md bg-primary-strong px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-strong/90 disabled:opacity-50"
                      >
                        지급 완료 처리
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminConfirmModal
        isOpen={payTarget !== null}
        onClose={() => setPayTarget(null)}
        onConfirm={handleMarkPaid}
        title="정산 지급 완료 처리"
        description={
          payTarget
            ? `${payTarget.artistName} · ${data.month} · 정산예정 ${formatKRW(payTarget.share)}. 실비 차감 후 실지급액과 메모를 입력하세요.`
            : ''
        }
        confirmText="지급 완료"
        variant="info"
        isLoading={isPending}
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">실지급액 (원)</span>
            <input
              type="text"
              inputMode="numeric"
              value={paidAmountInput}
              onChange={(e) => setPaidAmountInput(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">메모 (실비 내역·계좌 등)</span>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </AdminConfirmModal>
    </AdminCard>
  );
}
