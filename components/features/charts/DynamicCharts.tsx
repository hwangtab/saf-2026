'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { ChartErrorBoundary } from './ChartErrorBoundary';

const LoadingPlaceholder = () => (
  <div
    className="h-96 bg-gray-100 rounded animate-pulse"
    role="status"
    aria-busy="true"
    aria-label="차트를 로드하는 중입니다"
  />
);

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
  { ssr: false, loading: LoadingPlaceholder }
);

export const RejectionReasonsChart = dynamic(
  () =>
    import('@/components/features/charts/RejectionReasonsChart').then((mod) =>
      withErrorBoundary(mod.default, 'RejectionReasonsChart')
    ),
  { ssr: false, loading: LoadingPlaceholder }
);

export const HighInterestProductChart = dynamic(
  () =>
    import('@/components/features/charts/HighInterestProductChart').then((mod) =>
      withErrorBoundary(mod.default, 'HighInterestProductChart')
    ),
  { ssr: false, loading: LoadingPlaceholder }
);

export const InterestRateDistributionChart = dynamic(
  () =>
    import('@/components/features/charts/InterestRateDistributionChart').then((mod) =>
      withErrorBoundary(mod.default, 'InterestRateDistributionChart')
    ),
  { ssr: false, loading: LoadingPlaceholder }
);

export const DebtCollectionChart = dynamic(
  () =>
    import('@/components/features/charts/DebtCollectionChart').then((mod) =>
      withErrorBoundary(mod.default, 'DebtCollectionChart')
    ),
  { ssr: false, loading: LoadingPlaceholder }
);

export const CreativeImpactChart = dynamic(
  () =>
    import('@/components/features/charts/CreativeImpactChart').then((mod) =>
      withErrorBoundary(mod.default, 'CreativeImpactChart')
    ),
  { ssr: false, loading: LoadingPlaceholder }
);
