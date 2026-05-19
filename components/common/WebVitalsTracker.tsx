'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
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

// CLS는 SPA 환경에서 onCLS(cb)의 단일 누적 방식 대신 per-path 격리 전송.
// sendClsForPath: 특정 path에서 발생한 CLS 값을 GA4 + Vercel track으로 직접 전송.
function sendClsForPath(path: string, value: number, debugTarget?: string) {
  const rating: Metric['rating'] =
    value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
  const eventValue = Math.round(value * 1000);

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        value: eventValue,
        metric_name: 'CLS',
        metric_value: value,
        metric_rating: rating,
        metric_delta: value,
        page_path: path,
        debug_target: debugTarget,
        non_interaction: true,
      });
    } catch (err) {
      console.error('[web-vitals] CLS flush GA4 failed:', err);
    }
  }

  try {
    track('web_vitals', {
      metric_name: 'CLS',
      metric_value: value,
      metric_rating: rating,
      page_path: path,
      debug_target: debugTarget ?? null,
    });
  } catch (err) {
    console.error('[web-vitals] CLS flush Vercel track failed:', err);
  }
}

export default function WebVitalsTracker() {
  const pathname = usePathname();
  // pathRef: onCLS reportAllChanges 콜백에서 발생 시점의 path를 참조 (closure 대신 ref).
  const pathRef = useRef(stripLocale(pathname));
  // prevPathRef: SPA navigation 감지 및 직전 path flush용.
  const prevPathRef = useRef(stripLocale(pathname));

  // CLS per-path 누적용 ref 3개.
  // lastClsValueRef: 마지막으로 수신한 metric.value (web-vitals 전역 누적 max).
  // clsBaselineRef: 현재 path가 시작된 시점의 lastClsValue (이 값이 현재 path의 "0 기준선").
  // lastClsTargetRef: 현재 path에서 마지막으로 수신한 largestShiftTarget (shift attribution).
  const lastClsValueRef = useRef(0);
  const clsBaselineRef = useRef(0);
  const lastClsTargetRef = useRef<string | undefined>(undefined);

  // useLayoutEffect: paint 전에 동기적으로 실행 → 새 페이지의 초기 layout-shift가
  // 이전 path 누적값에 합산되는 타이밍 경합을 최소화.
  // SPA navigation 시 직전 path의 CLS를 flush하고 새 path 기준선을 리셋.
  useLayoutEffect(() => {
    const next = stripLocale(pathname);
    const prev = prevPathRef.current;

    if (next !== prev) {
      const prevPathCls = lastClsValueRef.current - clsBaselineRef.current;
      if (prevPathCls > 0) {
        sendClsForPath(prev, prevPathCls, lastClsTargetRef.current);
      }
      clsBaselineRef.current = lastClsValueRef.current;
      lastClsTargetRef.current = undefined;
      prevPathRef.current = next;
    }

    pathRef.current = next;
  }, [pathname]);

  useEffect(() => {
    // 진단: 컴포넌트가 production에서 실제 mount되는지 검증용 ping.
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      try {
        window.gtag('event', 'web_vitals_mount', {
          page_path: pathRef.current,
        });
      } catch (err) {
        console.error('[web-vitals] mount ping failed:', err);
      }
    }

    // LCP/FCP/INP/TTFB: 기존 방식 유지 (path별 단일 보고, SPA 문제 없음).
    // deps `[]` 절대 유지 — pathname deps 추가 시 SPA마다 재등록 → 2~5배 부풀림.
    const send = (metric: Metric) => sendToGA(metric, pathRef.current);
    onLCP(send);
    onFCP(send);
    onINP(send);
    onTTFB(send);

    // CLS: reportAllChanges: true로 매 shift entry마다 콜백 fire.
    // metric.delta 대신 metric.value - baseline 패턴으로 per-path CLS 산출.
    // 이유: metric.delta는 전역 session-window max 기준 변화량이므로 SPA nav 이후에도
    // 이전 path의 누적이 delta에 반영되어 단순 합산이 불가.
    // metric.value (전역 최댓값) - clsBaselineRef (현재 path 시작 시점의 전역값) =
    // 현재 path에서 발생한 CLS 기여분 (page별 독립 측정과 동일).
    onCLS(
      (metric) => {
        lastClsValueRef.current = metric.value;
        const target = truncate(
          (metric as CLSMetricWithAttribution).attribution?.largestShiftTarget
        );
        if (target) lastClsTargetRef.current = target;
      },
      { reportAllChanges: true }
    );

    // 페이지를 떠날 때 현재 path의 CLS를 최종 flush.
    // web-vitals 자체 visibilitychange 핸들러도 있지만 그 핸들러는 전역 누적값을 보고 —
    // 우리는 per-path 값만 flush하므로 별도 리스너 등록.
    const handleHidden = () => {
      if (document.visibilityState === 'hidden') {
        const currentPathCls = lastClsValueRef.current - clsBaselineRef.current;
        if (currentPathCls > 0) {
          sendClsForPath(pathRef.current, currentPathCls, lastClsTargetRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleHidden);
    return () => document.removeEventListener('visibilitychange', handleHidden);
  }, []);

  return null;
}
