'use client';

import { trackEvent, type AnalyticsValue } from '@/lib/analytics/track';

interface TrackedExternalLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  /** 분석 이벤트 이름 (snake_case). 예: 'donate_click'. */
  eventName: string;
  /** 추가 파라미터. position·target 등. */
  eventParams?: Record<string, AnalyticsValue>;
  /** 추가 anchor attribute. aria-label 등. */
  ariaLabel?: string;
}

/**
 * 외부 링크 + 분석 이벤트 송신 wrapper.
 *
 * Footer/FullscreenMenu 같은 server component 안에서 onClick으로 trackEvent를 부르려면
 * 이렇게 작은 client wrapper로 anchor를 감싸는 패턴이 표준. external link라 next/link
 * 대신 raw `<a>` 사용 + target='_blank' + rel='noopener noreferrer' 자동.
 */
export default function TrackedExternalLink({
  href,
  className,
  children,
  eventName,
  eventParams,
  ariaLabel,
}: TrackedExternalLinkProps) {
  const handleClick = () => {
    trackEvent(eventName, {
      ...eventParams,
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    });
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
