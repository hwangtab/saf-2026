'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
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
import { stripLocale } from '@/lib/path-rules';

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

    // GA4 dataLayer는 push로만 쓰고 read 하지 않음 — 정확한 shape 무관.
    dataLayer?: unknown[];
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

function sendToGA(metric: Metric, pagePath: string) {
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
    page_path: pagePath,
    // attribution: 어떤 element/resource가 metric에 책임 있는지 — CrUX 실측 CLS 1.00,
    // INP 느린 인터랙션 등 디버깅의 핵심 단서. 비어있을 수 있음.
    ...attribution,
    non_interaction: true, // 사용자 상호작용 카운트에서 제외 (bounce rate 영향 없음)
  };

  // gtag stub 등록은 GoogleAnalytics.tsx의 단일 출처에 위임.
  // 여기서 spread stub `(...args) => push(args)`를 등록하면 GoogleAnalytics 표준 stub
  // (`function(){push(arguments)}`)과 충돌해 dataLayer 항목 형태가 Array 가 되며,
  // gtag.js Tag-2.0이 Arguments-shape를 strict 검증해 collect 송신을 silent abort한다
  // (5/1~10 0건 회귀의 근본 원인). gtag 미등록 상태면 이 hit은 그냥 손실 — Vercel
  // Analytics 측 자체 적재가 살아 있어 admin 패널은 영향 없음.
  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', 'web_vitals', eventPayload);
    } catch (err) {
      console.error('[web-vitals] gtag send failed:', err);
    }
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
      page_path: pagePath,
      debug_target: attribution.debug_target ?? null,
    });
  } catch (err) {
    console.error('[web-vitals] vercel track send failed:', err);
  }
}

export default function WebVitalsTracker() {
  const pathname = usePathname();
  // SPA-aware page_path 캡처용 ref. web-vitals v5는 콜백을 페이지 lifetime당 1회만 등록 권장
  // ("Do not call onCLS() more than once per page load") — useEffect deps는 절대 []. pathname
  // 변경 시 ref만 갱신하면 콜백이 호출되는 시점(visibilitychange/pagehide)에 최신 path 캡처.
  // window.location.pathname을 콜백 시점에 캡처하면 SPA navigation 후 다음 페이지 path가
  // 잡혀 누적 CLS가 잘못된 페이지에 attribution됨 (관측된 /special/oh-yoon false signal 원인).
  // stripLocale로 locale prefix 정규화 — `/ko/artworks/123`과 `/en/artworks/123`을 동일 path로.
  const pathRef = useRef(stripLocale(pathname));
  useEffect(() => {
    pathRef.current = stripLocale(pathname);
  }, [pathname]);

  useEffect(() => {
    // 진단: 컴포넌트가 production에서 실제 mount되는지 검증용 ping.
    // GA4에 web_vitals_mount 이벤트가 들어오면 mount 성공이고, web-vitals
    // 콜백만 fire 안 하는 상황(저트래픽 + 짧은 세션). 이 이벤트도 0건이면
    // import 또는 mount 자체가 깨진 것.
    // stub 등록은 GoogleAnalytics 단일 출처에 위임 — mount ping이 GoogleAnalytics보다
    // 먼저 발화하면 GA4 송신만 손실(자체 page_views 적재는 살아있음).
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      try {
        window.gtag('event', 'web_vitals_mount', {
          page_path: pathRef.current,
        });
      } catch (err) {
        console.error('[web-vitals] mount ping failed:', err);
      }
    }

    // 각 metric은 페이지당 1회 자동 측정 후 콜백.
    // INP는 사용자 인터랙션 발생 시 누적 → 페이지 떠날 때 최종값 보고.
    // 콜백 내부에서 pathRef.current를 사용해 보고 시점의 최신 path로 attribution.
    // deps `[]` 절대 유지 — pathname을 deps에 넣으면 SPA navigation마다 콜백 재등록되어
    // web-vitals 이중 등록이 발생, 데이터가 2~5배 부풀려짐 (라이브러리 명시적 금지).
    const send = (metric: Metric) => sendToGA(metric, pathRef.current);
    onLCP(send);
    onCLS(send);
    onINP(send);
    onFCP(send);
    onTTFB(send);
  }, []);

  return null;
}
