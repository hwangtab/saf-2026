import { setRequestLocale } from 'next-intl/server';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import FailClient from './FailClient';

export const dynamic = 'force-static';

export default async function FundingFailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return (
    <div className={`min-h-screen ${HEADER_SAFE_TOP_PADDING}`}>
      <FailClient slug={slug} />
    </div>
  );
}
