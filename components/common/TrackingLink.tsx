'use client';

import { track } from '@vercel/analytics';

interface TrackClickProps {
  event: string;
  properties?: Record<string, string | number>;
  children: React.ReactNode;
}

export default function TrackClick({ event, properties, children }: TrackClickProps) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- 분석 추적 래퍼; 실제 상호작용 가능 요소는 children이 담당
    <span
      onClick={() => {
        try {
          track(event, properties);
        } catch (error) {
          console.error('[TrackingLink] Analytics track call failed:', error);
        }
      }}
    >
      {children}
    </span>
  );
}
