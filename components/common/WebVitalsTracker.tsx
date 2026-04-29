'use client';

import { useEffect } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Web Vitals → GA4 custom event 전송 — 무료 RUM 측정.
 *
 * Vercel Speed Insights(Pro plan $10 base + $0.65/data point) 대신 사용.
 * Google web-vitals 패키지(공식, 무료)로 LCP/CLS/INP/FCP/TTFB 측정해 GA4에 전송.
 *
 * GA4 대시보드 확인 방법:
 * - GA4 → 보고서 → 참여도 → 이벤트 → `web_vitals` 선택
 * - 매개변수 `metric_name`, `metric_value`, `metric_rating`, `page_path`로 분해
 * - 또는 탐색(Explore) → 매개변수 별 LCP/CLS/INP 분포 차트
 *
 * 데이터 의미:
 * - LCP: ms (Good ≤2500, Poor >4000)
 * - CLS: 0~1 layout shift score (Good ≤0.1, Poor >0.25)
 * - INP: ms 사용자 상호작용 응답성 (Good ≤200, Poor >500)
 * - FCP: ms 첫 콘텐츠 페인트
 * - TTFB: ms 첫 바이트 응답
 *
 * 비용 0 (GA4 무료 + web-vitals npm 무료).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;

    dataLayer?: any[];
  }
}

function sendToGA(metric: Metric) {
  if (typeof window === 'undefined') return;

  // GA4는 event value를 정수로만 받음 — CLS는 ×1000으로 정수화 (0.05 → 50).
  const eventValue = Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value);

  const eventPayload = {
    event_category: 'Web Vitals',
    event_label: metric.id,
    value: eventValue,
    metric_name: metric.name,
    metric_value: metric.value,
    metric_rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    metric_delta: metric.delta,
    metric_id: metric.id,
    page_path: window.location.pathname,
    non_interaction: true, // 사용자 상호작용 카운트에서 제외 (bounce rate 영향 없음)
  };

  // gtag.js가 lazyOnload(LCP 최적화)이라 vitals callback이 gtag 정의 전에 발화할 수 있음.
  // dataLayer에 직접 push해두면 gtag.js 로드 후 자동 처리됨 (Google 권장 패턴).
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'web_vitals', eventPayload);
  } else {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'web_vitals', ...eventPayload });
  }
}

export default function WebVitalsTracker() {
  useEffect(() => {
    // 각 metric은 페이지당 1회 자동 측정 후 콜백.
    // INP는 사용자 인터랙션 발생 시 누적 → 페이지 떠날 때 최종값 보고.
    onLCP(sendToGA);
    onCLS(sendToGA);
    onINP(sendToGA);
    onFCP(sendToGA);
    onTTFB(sendToGA);
  }, []);

  return null;
}
