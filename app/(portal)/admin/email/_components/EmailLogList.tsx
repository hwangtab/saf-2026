'use client';

import { useState, useTransition } from 'react';
import {
  AdminCard,
  AdminCardHeader,
  AdminSelect,
  AdminBadge,
  AdminEmptyState,
} from '@/app/(portal)/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/(portal)/admin/_components/AdminConfirmModal';
import { getEmailLogs, resendEmailLog, type EmailLogRow } from '@/app/actions/admin-email-logs';
import { useToast } from '@/lib/hooks/useToast';

type BadgeTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  sent: { label: '발송 완료', tone: 'success' },
  failed: { label: '발송 실패', tone: 'danger' },
};

const TYPE_LABELS: Record<string, string> = {
  payment_confirmed: '결제 완료',
  virtual_account_issued: '가상계좌 안내',
  bank_transfer_issued: '계좌이체 안내',
  deposit_confirmed: '입금 확인',
  shipped: '발송 완료',
  delivered: '배송 완료',
  refunded: '환불 완료',
  auto_cancelled: '자동 취소',
  artist_approval: '작가 승인',
};

// 서버 resendEmailLog의 RESENDABLE_TYPES와 일치.
const RESENDABLE_TYPES = new Set([
  'payment_confirmed',
  'deposit_confirmed',
  'shipped',
  'delivered',
]);

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'failed', label: '발송 실패' },
  { value: 'sent', label: '발송 완료' },
];

function formatKst(value: string) {
  return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export function EmailLogList({ initial }: { initial: EmailLogRow[] }) {
  const toast = useToast();
  const [rows, setRows] = useState<EmailLogRow[]>(initial);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmRow, setConfirmRow] = useState<EmailLogRow | null>(null);
  const [isResending, startResend] = useTransition();

  async function reload(nextStatus: string) {
    setLoading(true);
    try {
      const res = await getEmailLogs({
        status: nextStatus ? (nextStatus as 'sent' | 'failed') : undefined,
      });
      setRows(res.logs);
    } finally {
      setLoading(false);
    }
  }

  function onStatusChange(value: string) {
    setStatus(value);
    void reload(value);
  }

  function handleResend() {
    if (!confirmRow) return;
    const target = confirmRow;
    startResend(async () => {
      const res = await resendEmailLog(target.id);
      if (res.ok) {
        toast.success('이메일을 재발송했습니다.');
        setConfirmRow(null);
        void reload(status);
      } else {
        toast.error(res.error ?? '재발송에 실패했습니다.');
      }
    });
  }

  return (
    <AdminCard>
      <AdminCardHeader>
        <div className="flex items-center gap-3">
          <AdminSelect
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-40"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </AdminSelect>
          <p className="text-sm text-gray-500">{loading ? '불러오는 중…' : `${rows.length}건`}</p>
        </div>
      </AdminCardHeader>

      {rows.length === 0 ? (
        <AdminEmptyState title="이메일 로그 없음" description="조건에 맞는 발송 로그가 없습니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border-soft)] text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">시각</th>
                <th className="px-4 py-3">유형</th>
                <th className="px-4 py-3">수신</th>
                <th className="px-4 py-3">주문</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">오류</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border-soft)]">
              {rows.map((row) => {
                const meta = STATUS_META[row.status] ?? { label: row.status, tone: 'default' };
                const canResend = row.status === 'failed' && RESENDABLE_TYPES.has(row.type);
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {formatKst(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{TYPE_LABELS[row.type] ?? row.type}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-700">
                      {row.to_email}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {row.order_no ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-xs text-danger-a11y">
                      {row.error ?? ''}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canResend && (
                        <button
                          type="button"
                          onClick={() => setConfirmRow(row)}
                          className="whitespace-nowrap rounded-md bg-primary-strong px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-strong/90"
                        >
                          재발송
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminConfirmModal
        isOpen={confirmRow !== null}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleResend}
        title="이메일 재발송"
        description={
          confirmRow
            ? `${confirmRow.to_email}에게 ${TYPE_LABELS[confirmRow.type] ?? confirmRow.type} 이메일을 재발송합니다.`
            : ''
        }
        confirmText="재발송"
        variant="info"
        isLoading={isResending}
      />
    </AdminCard>
  );
}
