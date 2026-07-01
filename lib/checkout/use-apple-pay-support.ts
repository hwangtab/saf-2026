'use client';

import { useSyncExternalStore } from 'react';

/**
 * 애플페이 결제가 가능한 환경인지 감지한다.
 *
 * Toss 애플페이는 PC=Safari, 모바일=iOS에서만 동작하며, 정확히 그 환경에서만
 * `window.ApplePaySession`이 존재한다(맥 크롬·안드로이드·윈도우엔 없음). 따라서
 * feature detection이 Toss 지원 범위와 일치 — UA 스니핑보다 정확하고 오탐이 없다.
 *
 * useSyncExternalStore로 server snapshot=false, client snapshot=실제 감지값을 반환한다.
 * 초기 렌더(SSR·hydration)는 항상 false → 애플페이 옵션은 지원 환경에서만 나중에 추가되어
 * hydration mismatch가 없다. 애플페이 지원 여부는 세션 중 변하지 않으므로 구독은 no-op.
 */
const subscribe = () => () => {};

function getClientSnapshot(): boolean {
  try {
    const applePay = (
      window as unknown as { ApplePaySession?: { canMakePayments?: () => boolean } }
    ).ApplePaySession;
    return typeof applePay?.canMakePayments === 'function' && applePay.canMakePayments() === true;
  } catch {
    // canMakePayments가 보안 컨텍스트 밖에서 throw할 수 있음 — 그 경우 미지원 처리.
    return false;
  }
}

export function useApplePaySupport(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, () => false);
}
