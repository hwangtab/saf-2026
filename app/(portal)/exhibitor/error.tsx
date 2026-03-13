'use client';

import ErrorView from '@/components/common/ErrorView';
import { usePathname } from 'next/navigation';
import { resolveClientLocale } from '@/lib/client-locale';
import { getPortalErrorCopy } from '@/lib/portal-error-copy';

export default function ExhibitorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = getPortalErrorCopy('exhibitor', locale);

  return (
    <ErrorView
      icon="😔"
      title={copy.title}
      message={copy.message}
      backLink={{ href: '/exhibitor', label: copy.backLabel || 'Back' }}
      error={error}
      reset={reset}
    />
  );
}
