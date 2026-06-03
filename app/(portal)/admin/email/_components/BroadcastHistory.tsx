'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AdminBadge } from '@/app/(portal)/admin/_components/admin-ui';
import { getBroadcasts } from '@/app/actions/admin-broadcast';

type Broadcast = Awaited<ReturnType<typeof getBroadcasts>>[number];

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
  petition: '청원',
  individual: '직접 지정',
};

const ACTIVE_STATUSES = new Set(['queued', 'sending']);
const POLL_INTERVAL_MS = 8000;

function formatKst(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function ProgressBar({ sent, total }: { sent: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-canvas-strong">
        <div className="h-full rounded-full bg-success-a11y" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-charcoal">
        {sent.toLocaleString('ko-KR')}/{total.toLocaleString('ko-KR')}
      </span>
    </div>
  );
}

export function BroadcastHistory({ initial }: { initial: Broadcast[] }) {
  const [rows, setRows] = useState<Broadcast[]>(initial);
  const fetchingRef = useRef(false);

  // 서버 컴포넌트가 router.refresh로 새 스냅샷을 내려주면 로컬 상태를 다시 시드.
  // 단, 폴링이 이미 더 진행된 sent_count를 받아둔 행은 유지해 refresh의 stale 스냅샷이
  // 진행률을 뒤로 되돌리는 깜빡임을 막는다(initial을 기준 순서·신규 행으로 사용).
  useEffect(() => {
    setRows((prev) => {
      if (prev.length === 0) return initial;
      const prevById = new Map(prev.map((r) => [r.id, r]));
      return initial.map((r) => {
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
      const fresh = await getBroadcasts();
      setRows(fresh);
    } catch {
      // 폴링 실패는 조용히 무시 — 다음 주기에 재시도
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // queued/sending 건이 있을 때만 폴링하고, 모두 종료되면 자동 중단.
  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasActive, poll]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-charcoal-muted">
        발송 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="bg-canvas-strong text-left text-xs text-charcoal-muted">
            <th className="px-4 py-3 font-medium">채널</th>
            <th className="px-4 py-3 font-medium">제목</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 text-right font-medium">진행 (발송/대상)</th>
            <th className="px-4 py-3 text-right font-medium">실패</th>
            <th className="px-4 py-3 font-medium">완료/예약 시각</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gallery-divider">
          {rows.map((b) => {
            const meta = STATUS_META[b.status] ?? { label: b.status, tone: 'default' as BadgeTone };
            const recipients = b.recipient_count ?? 0;
            const sent = b.sent_count ?? 0;
            const failed = b.failed_count ?? 0;
            return (
              <tr key={b.id} className="bg-white">
                <td className="whitespace-nowrap px-4 py-3 text-charcoal-muted">
                  {CHANNEL_LABELS[b.channel] ?? b.channel}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-charcoal" title={b.subject}>
                  {b.subject}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  {/* sent_count는 dispatch가 청크마다 갱신하므로 발송 중에도 실시간 진행률 표시.
                      draft/cancelled는 발송 흐름이 아니므로 대상 수만. */}
                  {b.status === 'draft' || b.status === 'cancelled' ? (
                    <span className="text-charcoal-soft">
                      {recipients.toLocaleString('ko-KR')}명
                    </span>
                  ) : (
                    <ProgressBar sent={sent} total={recipients} />
                  )}
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
