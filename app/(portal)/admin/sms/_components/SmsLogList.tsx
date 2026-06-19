'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';

import {
  AdminCard,
  AdminCardHeader,
  AdminInput,
  AdminSelect,
  AdminBadge,
  AdminEmptyState,
} from '@/app/(portal)/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/(portal)/admin/_components/AdminConfirmModal';
import { EmailPagination } from '@/app/(portal)/admin/email/_components/EmailPagination';
import { getSmsLogs, resendSms, type SmsLogRow, type SmsLogsResult } from '@/app/actions/admin-sms';

type BadgeTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  sent: { label: '발송 완료', tone: 'success' },
  delivered: { label: '수신 확인', tone: 'success' },
  undelivered: { label: '미도달', tone: 'danger' },
  failed: { label: '발송 실패', tone: 'danger' },
};

const TYPE_LABELS: Record<string, string> = {
  payment_confirmed: '결제 완료',
  virtual_account_issued: '입금 안내',
  deposit_confirmed: '입금 확인',
  shipped: '발송 완료',
  delivered: '배송 완료',
  refunded: '환불 완료',
  auto_cancelled: '자동 취소',
};

const TYPE_OPTIONS = [
  { value: '', label: '전체 유형' },
  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'sent', label: '발송 완료' },
  { value: 'delivered', label: '수신 확인' },
  { value: 'undelivered', label: '미도달' },
  { value: 'failed', label: '발송 실패' },
];

// 서버 resendSms의 RESENDABLE_TYPES와 일치
const RESENDABLE_TYPES = new Set([
  'payment_confirmed',
  'virtual_account_issued',
  'deposit_confirmed',
  'shipped',
  'delivered',
  'refunded',
  'auto_cancelled',
]);

type Filters = { type: string; status: string; from: string; to: string; q: string };

function formatKst(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export function SmsLogList({
  initial,
  initialFilters,
}: {
  initial: SmsLogsResult;
  initialFilters: Filters;
}) {
  const [rows, setRows] = useState<SmsLogRow[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loadState, setLoadState] = useState<'done' | 'loading' | 'error'>('done');
  const [confirmLogId, setConfirmLogId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isResending, startResend] = useTransition();

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const loadPage = useCallback(
    async (nextPage: number, nextPageSize: number, nextFilters: Filters) => {
      setLoadState('loading');
      try {
        const fresh = await getSmsLogs({
          page: nextPage,
          pageSize: nextPageSize,
          type: nextFilters.type || undefined,
          status: nextFilters.status || undefined,
          from: nextFilters.from || undefined,
          to: nextFilters.to || undefined,
          q: nextFilters.q || undefined,
        });
        setRows(fresh.rows);
        setTotal(fresh.total);
        setPage(fresh.page);
        setPageSize(fresh.pageSize);
        setLoadState('done');
      } catch {
        setLoadState('error');
      }
    },
    []
  );

  function applyFilter(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    void loadPage(1, pageSize, next);
  }

  function handlePageChange(nextPage: number) {
    void loadPage(nextPage, pageSize, filters);
  }

  function handlePageSizeChange(nextPageSize: number) {
    void loadPage(1, nextPageSize, filters);
  }

  function handleResendConfirm() {
    const logId = confirmLogId;
    if (!logId) return;
    startResend(async () => {
      const result = await resendSms(logId);
      setConfirmLogId(null);
      if (result.ok) {
        setFeedback('재발송했습니다.');
        await loadPage(page, pageSize, filters);
      } else {
        setFeedback(result.error ?? '재발송에 실패했습니다.');
      }
    });
  }

  return (
    <AdminCard>
      <AdminCardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <AdminInput
            placeholder="수신번호 / 주문번호 검색"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilter({ q: filters.q });
            }}
            className="w-full sm:w-56"
          />
          <AdminSelect
            value={filters.type}
            onChange={(e) => applyFilter({ type: e.target.value })}
            className="w-full sm:w-44"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            value={filters.status}
            onChange={(e) => applyFilter({ status: e.target.value })}
            className="w-full sm:w-36"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AdminSelect>
          <AdminInput
            type="date"
            value={filters.from}
            onChange={(e) => applyFilter({ from: e.target.value })}
            className="w-full sm:w-40"
            aria-label="시작일"
          />
          <AdminInput
            type="date"
            value={filters.to}
            onChange={(e) => applyFilter({ to: e.target.value })}
            className="w-full sm:w-40"
            aria-label="종료일"
          />
        </div>
        <p className="text-sm text-charcoal-muted">{total.toLocaleString('ko-KR')}건</p>
      </AdminCardHeader>

      {feedback && (
        <output className="block px-6 pt-4 text-sm text-charcoal-muted">{feedback}</output>
      )}

      {loadState === 'error' ? (
        <div className="p-8 text-center">
          <p className="text-sm text-danger-a11y">발송 로그를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => void loadPage(page, pageSize, filters)}
            className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep hover:bg-canvas-soft"
          >
            다시 시도
          </button>
        </div>
      ) : rows.length === 0 ? (
        <AdminEmptyState title="발송 로그 없음" description="조건에 맞는 발송 내역이 없습니다." />
      ) : (
        <div className="space-y-3 p-6">
          {loadState === 'loading' && (
            <p className="text-xs text-charcoal-muted">발송 로그를 불러오는 중입니다...</p>
          )}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-canvas-strong text-left text-xs text-charcoal-muted">
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">수신번호</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">세그먼트</th>
                  <th className="px-4 py-3 font-medium">주문번호</th>
                  <th className="px-4 py-3 font-medium">발송시각</th>
                  <th className="px-4 py-3 text-right font-medium">재발송</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gallery-divider">
                {rows.map((log) => {
                  const meta = STATUS_META[log.status] ?? {
                    label: log.status,
                    tone: 'default' as BadgeTone,
                  };
                  const canResend =
                    log.status === 'failed' &&
                    Boolean(log.order_no) &&
                    RESENDABLE_TYPES.has(log.type);
                  return (
                    <tr key={log.id} className="bg-white">
                      <td className="whitespace-nowrap px-4 py-3 text-charcoal">
                        {TYPE_LABELS[log.type] ?? log.type}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-charcoal-muted">
                        {log.to_phone}
                      </td>
                      <td className="px-4 py-3">
                        <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                        {log.status === 'failed' && log.error && (
                          <span className="ml-2 text-xs text-charcoal-soft">{log.error}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-charcoal-muted">
                        {log.segment ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-charcoal-muted">
                        {log.order_no ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-charcoal-muted">
                        {formatKst(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!canResend || isResending}
                          onClick={() => setConfirmLogId(log.id)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-deep hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          재발송
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <EmailPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      <AdminConfirmModal
        isOpen={confirmLogId !== null}
        onClose={() => setConfirmLogId(null)}
        onConfirm={handleResendConfirm}
        title="SMS 재발송"
        description="이 건을 다시 발송합니다. 비용이 발생하며 수신자에게 문자가 재전송됩니다. 계속하시겠습니까?"
        confirmText="재발송"
        variant="warning"
        isLoading={isResending}
      />
    </AdminCard>
  );
}
