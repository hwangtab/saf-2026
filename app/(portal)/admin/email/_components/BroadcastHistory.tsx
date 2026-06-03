'use client';

import type { getBroadcasts } from '@/app/actions/admin-broadcast';

type Broadcast = Awaited<ReturnType<typeof getBroadcasts>>[number];

const STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  queued: '발송 준비 중',
  sending: '발송 중',
  sent: '발송 완료',
  failed: '발송 실패',
  cancelled: '취소됨',
};

const CHANNEL_LABELS: Record<string, string> = {
  customer: '고객',
  member: '작가·출품자',
  petition: '청원',
};

export function BroadcastHistory({ broadcasts }: { broadcasts: Broadcast[] }) {
  if (broadcasts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-charcoal-muted">
        발송 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-canvas-strong text-left text-xs text-charcoal-muted">
            <th className="px-4 py-3 font-medium">채널</th>
            <th className="px-4 py-3 font-medium">제목</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium text-right">수신자</th>
            <th className="px-4 py-3 font-medium text-right">발송</th>
            <th className="px-4 py-3 font-medium text-right">실패</th>
            <th className="px-4 py-3 font-medium">예약일시</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gallery-divider">
          {broadcasts.map((b) => (
            <tr key={b.id} className="bg-white">
              <td className="px-4 py-3 text-charcoal-muted">
                {CHANNEL_LABELS[b.channel] ?? b.channel}
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-charcoal">{b.subject}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    b.status === 'sent'
                      ? 'text-success-a11y'
                      : b.status === 'failed'
                        ? 'text-danger-a11y'
                        : 'text-charcoal-muted'
                  }
                >
                  {STATUS_LABELS[b.status] ?? b.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-charcoal">{b.recipient_count}</td>
              <td className="px-4 py-3 text-right text-success-a11y">{b.sent_count}</td>
              <td className="px-4 py-3 text-right text-danger-a11y">{b.failed_count}</td>
              <td className="px-4 py-3 text-xs text-charcoal-muted">
                {b.queued_at
                  ? new Date(b.queued_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
