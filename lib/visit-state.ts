import { storageGet, storageSet } from './storage';

const LAST_VISIT_KEY = 'saf:lastVisit';
const RETURN_THRESHOLD_DAYS = 1;

export interface VisitInfo {
  lastVisit: number | null;
  isReturning: boolean;
  daysSinceLastVisit: number | null;
}

/** 방문 기록을 읽고 현재 방문을 갱신한다. SSR에서는 isReturning=false로 반환. */
export function recordAndGetVisit(): VisitInfo {
  const stored = storageGet<number>(LAST_VISIT_KEY);
  const now = Date.now();
  storageSet(LAST_VISIT_KEY, now);

  if (stored === null) {
    return { lastVisit: null, isReturning: false, daysSinceLastVisit: null };
  }

  const daysSince = (now - stored) / (1000 * 60 * 60 * 24);
  return {
    lastVisit: stored,
    isReturning: daysSince >= RETURN_THRESHOLD_DAYS,
    daysSinceLastVisit: daysSince,
  };
}
