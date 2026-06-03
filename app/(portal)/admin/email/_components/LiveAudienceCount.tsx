'use client';

import clsx from 'clsx';

import type { ResolvedAudience } from './useResolvedAudience';

// Step 1 하단에 고정으로 붙는 실시간 수신자 수 pill. useResolvedAudience 결과를 표시만 한다.
export function LiveAudienceCount({ audience }: { audience: ResolvedAudience }) {
  const breakdownEntries = Object.entries(audience.breakdown);

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3 py-2 text-sm',
        audience.status === 'ready' && audience.count > 0
          ? 'bg-primary-surface text-primary-strong'
          : 'bg-canvas-strong text-charcoal-muted'
      )}
      aria-live="polite"
    >
      {audience.status === 'needs-selection' && (
        <span>{audience.needsSelectionReason ?? '대상을 선택해주세요.'}</span>
      )}

      {audience.status === 'loading' && <span>수신자 수 확인 중…</span>}

      {audience.status === 'error' && (
        <span className="text-danger-a11y">
          수신자 수를 불러오지 못했습니다. 받는 사람을 다시 선택하면 재시도합니다.
        </span>
      )}

      {audience.status === 'ready' && (
        <>
          <span className="font-semibold">
            현재 받는 사람 {audience.count.toLocaleString('ko-KR')}명
          </span>
          {audience.count === 0 && (
            <span className="text-charcoal-soft">— 발송 대상이 없습니다.</span>
          )}
          {breakdownEntries.length > 1 && (
            <span className="text-xs text-charcoal-muted">
              ({breakdownEntries.map(([k, v]) => `${k} ${v.toLocaleString('ko-KR')}`).join(' · ')})
            </span>
          )}
        </>
      )}
    </div>
  );
}
