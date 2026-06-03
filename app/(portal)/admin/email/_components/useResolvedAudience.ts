'use client';

import { useEffect, useRef, useState } from 'react';

import { previewAudience } from '@/app/actions/admin-broadcast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  segmentToPreviewArgs,
  type PreviewArgs,
  type RecipientSegment,
} from '@/lib/email/broadcast-segment';

export type AudienceStatus = 'loading' | 'ready' | 'needs-selection' | 'error';

export interface ResolvedAudience {
  status: AudienceStatus;
  count: number;
  breakdown: Record<string, number>;
  needsSelectionReason: string | null;
}

// 세그먼트가 바뀔 때마다 previewAudience를 자동 호출해 수신자 수를 살아있게 유지한다.
// - 수동 "미리보기" 버튼 폐기 → 항상 최신(stale 제거)
// - 400ms 디바운스 + 요청 id race 가드 → 청원 11k 같은 대규모 resolver의 응답 순서 역전 방지
// - 직접 지정(direct)은 서버 조회 없이 선택된 연락처 수를 즉시 반영
// 결과를 step1 인라인 카운트와 발송 요약 카드가 함께 구독해 중복 조회를 막는다.
//
// loading 여부는 별도 state가 아니라 "서버 결과의 key가 현재 args와 일치하는가"로 렌더에서 파생한다
// (effect 안에서 동기 setState 금지 — cascading render 회피).
export function useResolvedAudience(segment: RecipientSegment): ResolvedAudience {
  const isDirect = segment.kind === 'direct';
  const directCount = isDirect ? segment.contacts.length : 0;

  const previewArgs = isDirect ? null : segmentToPreviewArgs(segment);
  const argsKey = previewArgs ? JSON.stringify(previewArgs) : '';
  // 카드/드롭다운 선택 기반이라 600ms로 두어 빠른 토글 시 버려지는 무거운 서버 조회(청원 11k 등)를 줄인다.
  const debouncedKey = useDebounce(argsKey, 600);

  const [serverState, setServerState] = useState<{
    key: string;
    count: number;
    breakdown: Record<string, number>;
    error?: boolean;
  } | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (isDirect || !debouncedKey) return;
    const args = JSON.parse(debouncedKey) as PreviewArgs;
    const reqId = ++reqIdRef.current;
    previewAudience(args.channel, args.filter)
      .then((r) => {
        if (reqId !== reqIdRef.current) return; // 최신 요청만 반영(race 가드)
        setServerState({ key: debouncedKey, count: r.total, breakdown: r.breakdown });
      })
      .catch(() => {
        if (reqId !== reqIdRef.current) return;
        // 조회 실패를 '0명'으로 위장하지 않는다 — error 상태로 구분해 정당한 발송이 막히지 않게.
        setServerState({ key: debouncedKey, count: 0, breakdown: {}, error: true });
      });
  }, [debouncedKey, isDirect]);

  if (isDirect) {
    return {
      status: 'ready',
      count: directCount,
      breakdown: { 직접지정: directCount },
      needsSelectionReason: null,
    };
  }

  if (!previewArgs) {
    const reason =
      segment.kind === 'petition'
        ? '청원을 선택하면 수신자 수가 표시됩니다.'
        : segment.kind === 'artwork-buyer'
          ? '작품을 선택하면 수신자 수가 표시됩니다.'
          : null;
    return { status: 'needs-selection', count: 0, breakdown: {}, needsSelectionReason: reason };
  }

  // 서버 결과가 현재 args에 대한 것이고 디바운스도 안정됐을 때만 ready/error.
  const settled = serverState?.key === argsKey && argsKey === debouncedKey;
  if (!settled) {
    return {
      status: 'loading',
      count: serverState?.error ? 0 : (serverState?.count ?? 0),
      breakdown: serverState?.error ? {} : (serverState?.breakdown ?? {}),
      needsSelectionReason: null,
    };
  }

  if (serverState.error) {
    return { status: 'error', count: 0, breakdown: {}, needsSelectionReason: null };
  }

  return {
    status: 'ready',
    count: serverState.count,
    breakdown: serverState.breakdown,
    needsSelectionReason: null,
  };
}
