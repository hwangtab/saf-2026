'use client';

import { useEffect } from 'react';
import Script from 'next/script';

// Vercel 환경변수에 trailing newline이 들어가는 경우가 있어 GA4 measurement ID
// 매칭이 깨짐(`G-XXX\n`). gtag('config', 'G-XXX\n', ...)가 silent fail이라
// dataLayer에는 들어가지만 GA4 서버로 전송 안 됨 — RUM 14일+ 0건 회귀의 근본 원인.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim();

export default function GoogleAnalytics() {
  useEffect(() => {
    if (!GA_ID) return;
    // gtag stub — gtag.js가 후에 로드되어 큐를 처리. window.gtag가 이미 있으면 스킵.
    type GtagFn = (...args: unknown[]) => void;
    const w = window as Window & {
      dataLayer?: unknown[];
      gtag?: GtagFn;
    };
    if (typeof w.gtag === 'function') return;
    w.dataLayer = w.dataLayer || [];
    const gtag: GtagFn = function (...args) {
      w.dataLayer!.push(args);
    };
    w.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { page_path: window.location.pathname });
  }, []);

  if (!GA_ID) return null;

  // gtag.js만 next/script로 로드. 인라인 init은 useEffect로 직접 처리해
  // next/script의 inline-script 주입 경로(production에서 SyntaxError를 일으킨 코드 경로)를 우회.
  // afterInteractive — hydration 직후 로드, LCP 영향 미미.
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="afterInteractive"
    />
  );
}
