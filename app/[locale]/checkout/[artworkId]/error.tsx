'use client';

import ErrorView from '@/components/common/ErrorView';
import { usePathname } from 'next/navigation';
import { resolveClientLocale } from '@/lib/client-locale';
import { getErrorActionLabels } from '@/lib/portal-error-copy';

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const isEnglish = locale === 'en';
  const labels = getErrorActionLabels(locale);

  const title = isEnglish ? 'Checkout error' : '결제 오류';
  const message = error.message?.includes('configured')
    ? isEnglish
      ? 'The payment system is not ready yet. Please try again shortly.'
      : '결제 시스템이 아직 준비 중입니다. 잠시 후 다시 시도해주세요.'
    : isEnglish
      ? 'An error occurred while loading the checkout page. Please try again shortly.'
      : '결제 페이지를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  const backLabel = isEnglish ? 'Back to artworks' : '작품 목록으로';

  return (
    <ErrorView
      icon="⚠️"
      title={title}
      message={message}
      backLink={{ href: '/artworks', label: backLabel }}
      retryLabel={labels.retryLabel}
      homeLabel={labels.homeLabel}
      error={error}
      reset={reset}
    />
  );
}
