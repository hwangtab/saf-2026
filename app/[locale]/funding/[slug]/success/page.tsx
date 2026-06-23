import { setRequestLocale } from 'next-intl/server';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import SuccessClient from './SuccessClient';

export const dynamic = 'force-static';

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
