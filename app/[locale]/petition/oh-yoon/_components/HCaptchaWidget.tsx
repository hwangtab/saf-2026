'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface HCaptchaWidgetProps {
  sitekey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  /** 다크 hero 위에 두는 경우 'dark' (현재 폼은 흰 배경이라 기본 'light') */
  theme?: 'light' | 'dark';
}

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact' | 'invisible';
        }
      ) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
    onHCaptchaLoad?: () => void;
  }
}

/**
 * hCaptcha widget — raw script + render API.
 * @hcaptcha/react-hcaptcha 패키지 의존 없이 동작.
 */
export default function HCaptchaWidget({
  sitekey,
  onVerify,
  onExpire,
  theme = 'light',
}: HCaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!scriptLoaded) return;
    if (!containerRef.current) return;
    if (!window.hcaptcha) return;
    if (widgetIdRef.current) return; // 이미 렌더됨

    widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
      sitekey,
      theme,
      callback: (token) => onVerify(token),
      'expired-callback': () => onExpire?.(),
      'error-callback': () => onExpire?.(),
    });

    return () => {
      const id = widgetIdRef.current;
      if (id && window.hcaptcha) {
        try {
          window.hcaptcha.remove(id);
        } catch {
          /* ignore */
        }
      }
      widgetIdRef.current = null;
    };
  }, [scriptLoaded, sitekey, theme, onVerify, onExpire]);

  return (
    <>
      <Script
        src="https://js.hcaptcha.com/1/api.js?render=explicit"
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} aria-label="hCaptcha 봇 차단" />
    </>
  );
}
