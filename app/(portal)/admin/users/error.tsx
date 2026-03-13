'use client';

import ErrorView from '@/components/common/ErrorView';
import { usePathname } from 'next/navigation';
import { resolveClientLocale } from '@/lib/client-locale';
import { getPortalErrorCopy } from '@/lib/portal-error-copy';

export default function AdminUsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = getPortalErrorCopy('adminUsers', locale);

  return (
    <ErrorView
      icon="⚠️"
      title={copy.title}
      message={copy.message}
      backLink={{ href: '/admin/dashboard', label: copy.backLabel || 'Back' }}
      error={error}
      reset={reset}
    />
  );
}
