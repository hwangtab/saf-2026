'use client';

import { useSyncExternalStore } from 'react';

/**
 * 에러 경계(ErrorView)가 떠 있는 동안 헤더를 solid로 강제하기 위한 경량 신호.
 *
 * 배경: hero 라우트(예: /event/oh-yoon-memorial)는 헤더가 투명(흰 글씨) — 뒤의 어두운
 * PageHero 위에서만 가독성이 보장된다. 그런데 error.tsx가 렌더되면 배경이 흰색이라
 * 흰 글씨 헤더가 묻혀 보이지 않는다(2026-06-17 UI 버그). 에러 화면 동안에는 헤더를
 * solid로 강제해 가독성을 확보한다.
 *
 * layout/Context 플럼빙 없이 module-level store + useSyncExternalStore로 구현 —
 * Header와 error.tsx는 React 트리상 형제라 prop/context로 잇기 번거롭다. SSR 스냅샷은
 * false(=기존 동작)라 hydration mismatch가 없고, GlobalError·admin처럼 공개 헤더가
 * 없는 곳에서 호출돼도 구독자가 없어 무해하다.
 */

let errorActive = false;
const listeners = new Set<() => void>();

export function setErrorHeaderActive(active: boolean): void {
  if (errorActive === active) return;
  errorActive = active;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  return errorActive;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useErrorHeaderActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
