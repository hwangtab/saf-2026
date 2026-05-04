'use client';

import { useEffect } from 'react';
import {
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
  type CLSMetricWithAttribution,
  type INPMetricWithAttribution,
  type LCPMetricWithAttribution,
  type Metric,
} from 'web-vitals/attribution';

/**
 * Web Vitals → GA4 custom event 전송 — 무료 RUM 측정.
 *
 * Vercel Speed Insights(Pro plan $10 base + $0.65/data point) 대신 사용.
 * Google web-vitals 패키지(공식, 무료) attribution build로 LCP/CLS/INP/FCP/TTFB 측정 +
 * 어떤 element/리소스가 문제인지 selector·URL까지 GA4에 전송.
 *
 * GA4 대시보드 확인 방법:
 * - GA4 → 보고서 → 참여도 → 이벤트 → `web_vitals` 선택
 * - 매개변수 `metric_name`, `metric_value`, `metric_rating`, `page_path` + attribution 키들
 * - CLS poor 페이지 식별: metric_name=CLS + metric_rating=poor 필터 → debug_target 분포
 * - LCP 느린 페이지: metric_name=LCP → debug_target(이미지/텍스트), debug_url 분포
 * - INP 느린 인터랙션: metric_name=INP → debug_target(버튼/링크) 분포
 *
 * 데이터 의미:
 * - LCP: ms (Good ≤2500, Poor >4000)
 * - CLS: 0~1 layout shift score (Good ≤0.1, Poor >0.25). CrUX 1.00 진단용 attribution 핵심
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

// GA4 매개변수 값 100자 제한이라 selector를 적당히 자름.
function truncate(s: string | undefined, max = 100): string | undefined {
  if (!s) return undefined;
  return s.length <= max ? s : s.slice(0, max);
}

function extractAttribution(metric: Metric): {
  debug_target?: string;
  debug_url?: string;
  debug_phase?: string;
} {
  // attribution 필드는 metric.name별 다른 형태. 안전하게 narrow.
  switch (metric.name) {
    case 'CLS': {
      const a = (metric as CLSMetricWithAttribution).attribution;
      return {
        debug_target: truncate(a?.largestShiftTarget),
        debug_phase: a?.loadState, // 'loading' | 'dom-interactive' | 'dom-content-loaded' | 'complete'
      };
    }
    case 'LCP': {
      const a = (metric as LCPMetricWithAttribution).attribution;
      return {
        debug_target: truncate(a?.target),
        debug_url: truncate(a?.url, 200),
      };
    }
    case 'INP': {
      const a = (metric as INPMetricWithAttribution).attribution;
      return {
        debug_target: truncate(a?.interactionTarget),
        debug_phase: a?.interactionType, // 'pointer' | 'keyboard'
      };
    }
    default:
      return {};
  }
}

function sendToGA(metric: Metric) {
  if (typeof window === 'undefined') return;

  // GA4는 event value를 정수로만 받음 — CLS는 ×1000으로 정수화 (0.05 → 50).
  const eventValue = Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value);

  const attribution = extractAttribution(metric);

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
    // attribution: 어떤 element/resource가 metric에 책임 있는지 — CrUX 실측 CLS 1.00,
    // INP 느린 인터랙션 등 디버깅의 핵심 단서. 비어있을 수 있음.
    ...attribution,
    non_interaction: true, // 사용자 상호작용 카운트에서 제외 (bounce rate 영향 없음)
  };

  // gtag.js가 lazyOnload(LCP 최적화)이라 vitals callback이 gtag 정의 전에 발화함.
  // gtag.js와 동일한 stub을 미리 정의해 dataLayer에 함수 인자(arguments) 형태로 큐잉.
  // gtag.js 로드 후 큐를 순차 처리. (객체 push는 GTM 전용 — gtag.js는 무시)
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtagStub(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
  window.gtag('event', 'web_vitals', eventPayload);
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
