'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';
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
  // 정통 Google bootstrap 패턴(`function gtag(){dataLayer.push(arguments)}`)을 그대로
  // 사용해 dataLayer에 IArguments 형태로 큐잉 — rest spread Array push 대신.
  // gtag.js 로드 후 큐를 순차 처리할 때 IArguments 형태를 기대하므로 호환성 보장.
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args);
    };
  }
  try {
    window.gtag('event', 'web_vitals', eventPayload);
  } catch (err) {
    // gtag 호출 자체 실패는 흔치 않지만 silently fail 하면 진단 불가.
    console.error('[web-vitals] gtag send failed:', err);
  }

  // 자체 page_views 테이블 적재 — Vercel Analytics Drain webhook으로 Supabase에
  // event_type='event', event_name='web_vitals'으로 들어가 어드민 패널이 GA4 의존 없이
  // p75·분포 등 풍부한 분석을 자체 RPC로 직접 산출. Vercel track API는 nested object를
  // 못 받아 attribution은 평탄화된 키만 보냄.
  try {
    track('web_vitals', {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      page_path: window.location.pathname,
      debug_target: attribution.debug_target ?? null,
    });
  } catch (err) {
    console.error('[web-vitals] vercel track send failed:', err);
  }
}

export default function WebVitalsTracker() {
  useEffect(() => {
    // 진단: 컴포넌트가 production에서 실제 mount되는지 검증용 ping.
    // GA4에 'web_vitals_mount' 이벤트가 들어오면 mount 성공이고, web-vitals
    // 콜백만 fire 안 하는 상황(저트래픽 + 짧은 세션). 이 이벤트도 0건이면
    // import 또는 mount 자체가 깨진 것.
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      if (typeof window.gtag !== 'function') {
        window.gtag = function gtagStub() {
          window.dataLayer!.push(arguments);
        };
      }
      try {
        window.gtag('event', 'web_vitals_mount', {
          page_path: window.location.pathname,
        });
      } catch (err) {
        console.error('[web-vitals] mount ping failed:', err);
      }
    }

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
