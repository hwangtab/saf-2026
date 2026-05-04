'use client';

import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      {/* afterInteractive — 페이지 interactive 직후 로드. lazyOnload는 LCP는 더 보호하지만
          web-vitals(LCP/CLS/INP) 콜백이 짧은 세션에서 gtag.js 로드 전 발화 → stub 큐가
          처리되기 전 페이지 닫혀 이벤트 영구 손실되는 문제 발생(GA4에 web_vitals 14일간
          0건). afterInteractive는 hydration 직후라 web-vitals callback과 race 없음.
          gtag.js는 async라 LCP에 미치는 영향 미미. */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
