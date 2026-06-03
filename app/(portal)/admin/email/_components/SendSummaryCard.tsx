'use client';

import { AdminBadge } from '@/app/(portal)/admin/_components/admin-ui';
import { RECIPIENT_KIND_META, type RecipientSegment } from '@/lib/email/broadcast-segment';
import type { ResolvedAudience } from './useResolvedAudience';

interface Props {
  segment: RecipientSegment;
  audience: ResolvedAudience;
  isAdvertisement: boolean;
  subject: string;
  confirmed: boolean;
  onConfirmedChange: (v: boolean) => void;
  blockReason: string | null;
  error: string | null;
  notice: string | null;
  success: string | null;
  isPending: boolean;
  isTestPending: boolean;
  onSend: () => void;
  onTest: () => void;
}

export function SendSummaryCard({
  segment,
  audience,
  isAdvertisement,
  subject,
  confirmed,
  onConfirmedChange,
  blockReason,
  error,
  notice,
  success,
  isPending,
  isTestPending,
  onSend,
  onTest,
}: Props) {
  // 야간(21~8시) 경고는 광고 발송일 때만(정통망법 야간광고 규제).
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour < 8;

  const meta = RECIPIENT_KIND_META[segment.kind];
  const countKnown = audience.status === 'ready';
  const noRecipients = countKnown && audience.count === 0;
  const audienceError = audience.status === 'error';

  // 수신자 수 미확정(로딩/에러/미선택)이거나 0명·미확인·미차단·처리중이면 발송 차단.
  // 테스트 발송과도 교차 비활성화해 두 작업이 동시에 진행되지 않게 한다.
  const sendDisabled =
    isPending || isTestPending || Boolean(blockReason) || !confirmed || !countKnown || noRecipients;

  const countText = countKnown
    ? `${audience.count.toLocaleString('ko-KR')}명`
    : audience.status === 'loading'
      ? '확인 중…'
      : audienceError
        ? '확인 실패'
        : '대상 선택 필요';

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-charcoal-deep">발송 요약</h3>

      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-charcoal-muted">받는 사람</dt>
          <dd className="text-right font-medium text-charcoal-deep">
            {meta.label} · {countText}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-charcoal-muted">광고 여부</dt>
          <dd className="flex flex-wrap items-center justify-end gap-1.5">
            {isAdvertisement ? (
              <AdminBadge tone="info">(광고)</AdminBadge>
            ) : (
              <AdminBadge tone="success">정보성</AdminBadge>
            )}
            {isAdvertisement && isNight && <AdminBadge tone="warning">야간 발송 주의</AdminBadge>}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-2">
          <dt className="shrink-0 text-charcoal-muted">제목</dt>
          <dd className="truncate text-right text-charcoal">
            {isAdvertisement && <span className="text-charcoal-muted">(광고) </span>}
            {subject || <span className="text-charcoal-soft">(제목 없음)</span>}
          </dd>
        </div>
      </dl>

      {isAdvertisement && isNight && (
        <p className="rounded-lg bg-charcoal-deep/5 px-3 py-2 text-xs text-charcoal-deep">
          ⚠️ 지금은 야간(21시~8시)입니다. 정보통신망법상 야간 광고 발송은 수신자의 사전 동의가
          필요합니다. 동의를 확인하지 못했다면 주간에 발송하세요.
        </p>
      )}

      <label className="flex cursor-pointer items-start gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          className="mt-0.5 rounded border-gray-300"
        />
        <span>
          {countKnown && audience.count > 0 ? (
            <>
              <strong>{audience.count.toLocaleString('ko-KR')}명</strong>에게{' '}
              {isAdvertisement ? '(광고) ' : ''}발송합니다.{' '}
            </>
          ) : null}
          받는 사람·광고 여부·제목·본문을 확인했습니다.
        </span>
      </label>

      {/* 동적 피드백은 스크린리더에 통지(차단/에러=assertive, 성공=polite) */}
      <div aria-live="assertive" className="space-y-1 empty:hidden">
        {blockReason && <p className="text-sm text-danger-a11y">{blockReason}</p>}
        {audienceError && !blockReason && (
          <p className="text-sm text-danger-a11y">
            수신자 수를 불러오지 못해 발송할 수 없습니다. 받는 사람을 다시 선택해 재시도하세요.
          </p>
        )}
        {noRecipients && !blockReason && (
          <p className="text-sm text-danger-a11y">발송 대상 수신자가 없습니다.</p>
        )}
        {error && <p className="text-sm text-danger-a11y">{error}</p>}
        {notice && (
          <p className="rounded-lg bg-charcoal-deep/5 px-3 py-2 text-sm text-charcoal-deep">
            {notice}
          </p>
        )}
      </div>
      <div aria-live="polite" className="empty:hidden">
        {success && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success-a11y">
            {success} 아래 “발송 이력”에서 진행 상황을 확인하세요.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onSend}
          disabled={sendDisabled}
          className="rounded-lg bg-primary-strong px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-strong/90 disabled:opacity-50"
        >
          {isPending ? '발송 처리 중...' : '발송하기'}
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={isTestPending || isPending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-charcoal hover:bg-canvas-strong disabled:opacity-50"
        >
          {isTestPending ? '테스트 보내는 중...' : '나에게 테스트 보내기 (관리자 계정 이메일로)'}
        </button>
      </div>
    </div>
  );
}
