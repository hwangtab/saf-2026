'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { AdminBadge } from '@/app/(portal)/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/(portal)/admin/_components/AdminConfirmModal';
import {
  getSmsBroadcasts,
  retryFailedRecipients,
  cancelBroadcast,
} from '@/app/actions/admin-sms-broadcast';
import { EmailPagination } from '@/app/(portal)/admin/email/_components/EmailPagination';

type BroadcastList = Awaited<ReturnType<typeof getSmsBroadcasts>>;
type Broadcast = BroadcastList['rows'][number];
type BadgeTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: '임시저장', tone: 'default' },
  queued: { label: '발송 준비 중', tone: 'info' },
  sending: { label: '발송 중', tone: 'info' },
  sent: { label: '발송 완료', tone: 'success' },
  failed: { label: '발송 실패', tone: 'danger' },
  cancelled: { label: '취소됨', tone: 'default' },
};

const CHANNEL_LABELS: Record<string, string> = {
  customer: '고객 마케팅',
  member: '작가·출품자',
  individual: '직접 지정',
};

const ACTIVE_STATUSES = new Set(['queued', 'sending']);
const CANCELLABLE_STATUSES = new Set(['queued', 'sending']);
const RETRYABLE_STATUSES = new Set(['sent', 'failed']);
const POLL_INTERVAL_MS = 8000;

function formatKst(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

type ActionModalState =
  | { type: 'cancel'; broadcastId: string }
  | { type: 'retry'; broadcastId: string; failedCount: number }
  | null;

export function SmsBroadcastHistory({ initial }: { initial: BroadcastList }) {
  const [rows, setRows] = useState<Broadcast[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [loadState, setLoadState] = useState<'done' | 'loading' | 'error'>('done');
  const [actionModal, setActionModal] = useState<ActionModalState>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isActing, startAction] = useTransition();
  const fetchingRef = useRef(false);

  useEffect(() => {
    setTotal(initial.total);
    setRows((prev) => {
      if (prev.length === 0) return initial.rows;
      const prevById = new Map(prev.map((r) => [r.id, r]));
      return initial.rows.map((r) => {
        const old = prevById.get(r.id);
        return old && (old.sent_count ?? 0) > (r.sent_count ?? 0) ? old : r;
      });
    });
  }, [initial]);

  const hasActive = rows.some((b) => ACTIVE_STATUSES.has(b.status));

  const poll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const fresh = await getSmsBroadcasts({ page, pageSize });
      setRows(fresh.rows);
      setTotal(fresh.total);
    } catch {
      // 폴링 실패는 조용히 무시
    } finally {
      fetchingRef.current = false;
    }
  }, [page, pageSize]);

  const loadPage = useCallback(async (nextPage: number, nextPageSize: number) => {
    setLoadState('loading');
    try {
      const fresh = await getSmsBroadcasts({ page: nextPage, pageSize: nextPageSize });
      setRows(fresh.rows);
      setTotal(fresh.total);
      setPage(fresh.page);
      setPageSize(fresh.pageSize);
      setLoadState('done');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasActive, poll]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  function handleCancelConfirm() {
    if (actionModal?.type !== 'cancel') return;
    const { broadcastId } = actionModal;
    startAction(async () => {
      const result = await cancelBroadcast(broadcastId);
      setActionModal(null);
      setFeedback(
        result.error
          ? (result.message ?? '취소에 실패했습니다.')
          : (result.message ?? '취소했습니다.')
      );
      await loadPage(page, pageSize);
    });
  }

  function handleRetryConfirm() {
    if (actionModal?.type !== 'retry') return;
    const { broadcastId } = actionModal;
    startAction(async () => {
      const result = await retryFailedRecipients(broadcastId);
      setActionModal(null);
      setFeedback(
        result.error
          ? (result.message ?? '재발송에 실패했습니다.')
          : (result.message ?? '재발송을 시작했습니다.')
      );
      await loadPage(page, pageSize);
    });
  }

  if (loadState === 'error') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-danger-a11y">발송 이력을 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => void loadPage(page, pageSize)}
          className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep hover:bg-canvas-soft"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-charcoal-muted">
        발송 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loadState === 'loading' && (
        <p className="text-xs text-charcoal-muted">발송 이력을 불러오는 중입니다...</p>
      )}
      {feedback && <output className="block text-sm text-charcoal-muted">{feedback}</output>}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="bg-canvas-strong text-left text-xs text-charcoal-muted">
              <th className="px-4 py-3 font-medium">채널</th>
              <th className="px-4 py-3 font-medium">본문</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 text-right font-medium">진행 (발송/대상)</th>
              <th className="px-4 py-3 text-right font-medium">실패</th>
              <th className="px-4 py-3 font-medium">완료/예약 시각</th>
              <th className="px-4 py-3 text-right font-medium">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gallery-divider">
            {rows.map((b) => {
              const meta = STATUS_META[b.status] ?? {
                label: b.status,
                tone: 'default' as BadgeTone,
              };
              const recipients = b.recipient_count ?? 0;
              const sent = b.sent_count ?? 0;
              const failed = b.failed_count ?? 0;
              const canCancel = CANCELLABLE_STATUSES.has(b.status);
              const canRetry = RETRYABLE_STATUSES.has(b.status) && failed > 0;
              return (
                <tr key={b.id} className="bg-white">
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal-muted">
                    {CHANNEL_LABELS[b.channel] ?? b.channel}
                    {b.is_advertisement && (
                      <span className="ml-1 text-xs text-charcoal-soft">(광고)</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-charcoal" title={b.body_text}>
                    {b.body_text}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-charcoal">
                    {sent.toLocaleString('ko-KR')}/{recipients.toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {failed > 0 ? (
                      <span className="text-danger-a11y">{failed.toLocaleString('ko-KR')}</span>
                    ) : (
                      <span className="text-charcoal-soft">0</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-charcoal-muted">
                    {b.status === 'sent' ? formatKst(b.sent_at) : formatKst(b.queued_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canCancel && (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => setActionModal({ type: 'cancel', broadcastId: b.id })}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-deep hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          취소
                        </button>
                      )}
                      {canRetry && (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() =>
                            setActionModal({
                              type: 'retry',
                              broadcastId: b.id,
                              failedCount: failed,
                            })
                          }
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-deep hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          실패분 재발송
                        </button>
                      )}
                    </div>
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
        onPageChange={(next) => void loadPage(next, pageSize)}
        onPageSizeChange={(next) => void loadPage(1, next)}
      />

      <AdminConfirmModal
        isOpen={actionModal?.type === 'cancel'}
        onClose={() => setActionModal(null)}
        onConfirm={handleCancelConfirm}
        title="캠페인 발송 취소"
        description="이 캠페인 발송을 취소합니다. 아직 발송되지 않은 수신자에게는 문자가 가지 않습니다. 계속하시겠습니까?"
        confirmText="취소 확인"
        variant="danger"
        isLoading={isActing}
      />

      <AdminConfirmModal
        isOpen={actionModal?.type === 'retry'}
        onClose={() => setActionModal(null)}
        onConfirm={handleRetryConfirm}
        title="실패분 재발송"
        description={
          actionModal?.type === 'retry'
            ? `실패한 ${actionModal.failedCount.toLocaleString('ko-KR')}건을 다시 발송합니다. 해당 건만 재과금됩니다. 계속하시겠습니까?`
            : '실패한 수신자를 다시 발송합니다.'
        }
        confirmText="재발송"
        variant="warning"
        isLoading={isActing}
      />
    </div>
  );
}
