'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { ChartErrorBoundary } from './ChartErrorBoundary';

// CLS 회피: ChartContainer 실제 높이(p-6 padding 48 + title h3 mb-4 ~48 +
// ResponsiveContainer height 300 + description ~36 ≈ 432px)와 placeholder 사이
// 차이가 크면 chart chunk 로드 후 layout shift 발생. min-h-[400px]로 일치.
// (ChartSkeleton in ChartContainer.tsx도 동일 값.)
const LoadingPlaceholder = ({ label }: { label: string }) => (
  <div
    className="min-h-[400px] bg-gray-100 rounded animate-pulse"
    role="status"
    aria-busy="true"
    aria-label={label}
  />
);

function createLoadingPlaceholder() {
  return function ChartLoadingPlaceholder() {
    const t = useTranslations('common');
    return <LoadingPlaceholder label={t('loadingChart')} />;
  };
}

function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  displayName: string
): ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ChartErrorBoundary>
      <Component {...props} />
    </ChartErrorBoundary>
  );
  WrappedComponent.displayName = `WithErrorBoundary(${displayName})`;
  return WrappedComponent;
}

export const FirstBankAccessChart = dynamic(
  () =>
    import('@/components/features/charts/FirstBankAccessChart').then((mod) =>
      withErrorBoundary(mod.default, 'FirstBankAccessChart')
    ),
  { ssr: false, loading: createLoadingPlaceholder() }
);

export const RejectionReasonsChart = dynamic(
  () =>
    import('@/components/features/charts/RejectionReasonsChart').then((mod) =>
      withErrorBoundary(mod.default, 'RejectionReasonsChart')
    ),
  { ssr: false, loading: createLoadingPlaceholder() }
);

export const HighInterestProductChart = dynamic(
  () =>
    import('@/components/features/charts/HighInterestProductChart').then((mod) =>
      withErrorBoundary(mod.default, 'HighInterestProductChart')
    ),
  { ssr: false, loading: createLoadingPlaceholder() }
);

export const InterestRateDistributionChart = dynamic(
  () =>
    import('@/components/features/charts/InterestRateDistributionChart').then((mod) =>
      withErrorBoundary(mod.default, 'InterestRateDistributionChart')
    ),
  { ssr: false, loading: createLoadingPlaceholder() }
);

export const DebtCollectionChart = dynamic(
  () =>
    import('@/components/features/charts/DebtCollectionChart').then((mod) =>
      withErrorBoundary(mod.default, 'DebtCollectionChart')
    ),
  { ssr: false, loading: createLoadingPlaceholder() }
);

export const CreativeImpactChart = dynamic(
  () =>
    import('@/components/features/charts/CreativeImpactChart').then((mod) =>
      withErrorBoundary(mod.default, 'CreativeImpactChart')
    ),
  { ssr: false, loading: createLoadingPlaceholder() }
);
