'use client';

import { usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import GoogleAnalytics from '@/components/common/GoogleAnalytics';
import WebVitalsTracker from '@/components/common/WebVitalsTracker';
import { stripLocale } from '@/lib/path-rules';

const ANALYTICS_DISABLED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/exhibitor',
  '/onboarding',
  '/login',
  '/signup',
  '/terms-consent',
];

function isAnalyticsDisabledPath(pathname: string): boolean {
  const normalized = stripLocale(pathname);
  return ANALYTICS_DISABLED_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export default function GlobalAnalyticsGate() {
  const pathname = usePathname();

  if (isAnalyticsDisabledPath(pathname)) {
    return null;
  }

  return (
    <>
      <Analytics />
      <GoogleAnalytics />
      <WebVitalsTracker />
    </>
  );
}
