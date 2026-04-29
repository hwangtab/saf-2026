'use client';

import { usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import GoogleAnalytics from '@/components/common/GoogleAnalytics';

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
  return ANALYTICS_DISABLED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
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
    </>
  );
}
