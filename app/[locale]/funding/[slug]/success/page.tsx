import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import SuccessClient from './SuccessClient';

export const dynamic = 'force-static';

// 후원 결제 완료 랜딩은 색인 대상 아님 — 다른 success/fail(checkout·event)과 동일 정책.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function FundingSuccessPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className={`min-h-screen ${HEADER_SAFE_TOP_PADDING}`}>
      <SuccessClient />
    </div>
  );
}
