'use client';

import ErrorView from '@/components/common/ErrorView';
import { usePathname } from 'next/navigation';
import { resolveClientLocale } from '@/lib/client-locale';
import { getPortalErrorCopy, getErrorActionLabels } from '@/lib/portal-error-copy';

export default function AdminRevenueError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = getPortalErrorCopy('adminRevenue', locale);
  const labels = getErrorActionLabels(locale);

  return (
    <ErrorView
      icon="⚠️"
      title={copy.title}
      message={copy.message}
      backLink={{ href: '/admin/dashboard', label: copy.backLabel || 'Back' }}
      retryLabel={labels.retryLabel}
      homeLabel={labels.homeLabel}
      error={error}
      reset={reset}
    />
  );
}
