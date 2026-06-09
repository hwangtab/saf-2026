import { track as vercelTrack } from '@vercel/analytics';

/**
 * 분석 이벤트 통합 송신 helper.
 *
 * **이중 송신 정책 (의도된 architecture)**:
 * 1) Vercel Analytics `track()` → Drain webhook → Supabase `page_views` 테이블
 *    - 어드민 분석 패널이 직접 RPC로 집계 (단일 출처)
 * 2) GA4 `gtag('event', ...)` → 외부 GA4 UI
 *    - 마케팅 외부 도구 연동·BigQuery export 등
 *
 * **호출 부 안전성**:
 * - 분석 송신 실패가 비즈니스 흐름(navigation 등)을 막지 않도록 모든 단계 try/catch
 * - SSR 환경에서 호출돼도 안전 (typeof window check)
 * - Vercel `track` properties 제약: string | number | boolean | null만 허용 (object/array 금지)
 *
 * **이벤트 이름 컨벤션**:
 * - snake_case로 통일 (GA4 자동 이벤트와 컨벤션 맞추고 SQL where 절에서 다루기 편함)
 * - 예: `donate_click`, `share_click`, `web_vitals`, `story_to_artwork_click`
 */
export type AnalyticsValue = string | number | boolean | null;
export type Ga4EventParams = Record<string, unknown>;

interface TrackEventOptions {
  ga4Params?: Ga4EventParams;
}

export function trackEvent(
  name: string,
  params: Record<string, AnalyticsValue> = {},
  options: TrackEventOptions = {}
): void {
  // SSR safety
  if (typeof window === 'undefined') return;

  // 1) 자체 page_views 테이블 적재 — 어드민 패널의 단일 데이터 출처
  try {
    vercelTrack(name, params);
  } catch (err) {
    console.error('[analytics] vercel track failed:', err);
  }

  // 2) GA4 — 외부 분석 도구
  try {
    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === 'function') {
      w.gtag('event', name, options.ga4Params ?? params);
    }
  } catch (err) {
    console.error('[analytics] gtag send failed:', err);
  }
}
