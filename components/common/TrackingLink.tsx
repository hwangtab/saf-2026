'use client';

import { track } from '@vercel/analytics';

interface TrackClickProps {
  event: string;
  properties?: Record<string, string | number>;
  children: React.ReactNode;
}

export default function TrackClick({ event, properties, children }: TrackClickProps) {
  return (
    <span
      onClick={() => {
        try {
          track(event, properties);
        } catch {
          // analytics not loaded
        }
      }}
    >
      {children}
    </span>
  );
}
