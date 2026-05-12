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
    // GA4 official stub은 `function gtag(){dataLayer.push(arguments)}` 패턴 (Arguments 객체).
    // spread `(...args) => push(args)`로 하면 진짜 Array로 push되는데, gtag.js 내부의
    // Consent Mode 처리·Tag-2.0 처리 일부 분기가 Arguments-shape를 strict하게 검사한다는
    // 보고가 있어 표준 stub으로 통일. (5/1~10 collect 0건 회귀의 잔여 가설 제거용)
    const gtag = function (this: void) {
      w.dataLayer!.push(arguments);
    } as unknown as GtagFn;
    w.gtag = gtag;
    // Consent Mode v2 명시: 2024년 이후 gtag.js는 consent 신호 없이 wait_for_update가
    // timeout되면 collect 차단(2026-05-01 무수신 전환 추정 원인). 한국 사이트는 EU
    // GDPR 대상 아니라 default granted로 명시. EU 사용자 추가될 때 region별 분기 도입.
    gtag('consent', 'default', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
      functionality_storage: 'granted',
      personalization_storage: 'granted',
      security_storage: 'granted',
    });
    gtag('js', new Date());
    gtag('config', GA_ID, { page_path: window.location.pathname });
  }, []);

  if (!GA_ID) return null;

  // gtag.js만 next/script로 로드. 인라인 init은 useEffect로 직접 처리해
  // next/script의 inline-script 주입 경로(production에서 SyntaxError를 일으킨 코드 경로)를 우회.
  //
  // strategy="lazyOnload" — `window.load` 이후 idle 시점에 로드. afterInteractive는
  // hydration 직후 즉시 fetch + HTML head에 `<link rel="preload" href=".../gtag/js?id=...">`
  // 를 자동 주입하는데, gtag/js 157KB raw / 65KB unused / scripting 166ms가 단일 자산
  // 1순위 bootup 비용이라 LCP 이미지 fetch와 1.4s 시점 network slot을 경합한다.
  // PSI mobile audit: TBT -200~400ms, FCP -50~100ms 회수 + preload 제거로 LCP 이미지
  // 우선순위 회복. 트레이드오프: GA 이벤트가 페이지 로드 후 ~1초 지연되어 매우 짧은
  // 세션은 web_vitals_mount 이벤트가 손실될 수 있음(stub은 useEffect에서 즉시 등록되어
  // dataLayer는 큐잉. gtag.js 로드 시 큐 일괄 처리). page_view·web_vitals 측정 무영향.
  //
  // Consent Mode v2 default granted는 useEffect에서 이미 등록됨(`735c3b76`) — gtag.js가
  // 늦게 로드되어도 dataLayer 큐의 consent 신호를 우선 처리해 collect 차단 없음.
  return (
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
  );
}
