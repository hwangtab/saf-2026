'use client';

import dynamic from 'next/dynamic';

const LoadingPlaceholder = () => <div className="h-96 bg-gray-100 rounded animate-pulse" />;

export const FirstBankAccessChart = dynamic(
  () => import('@/components/features/charts/FirstBankAccessChart'),
  { ssr: false, loading: LoadingPlaceholder }
);

export const RejectionReasonsChart = dynamic(
  () => import('@/components/features/charts/RejectionReasonsChart'),
  { ssr: false, loading: LoadingPlaceholder }
);

export const HighInterestProductChart = dynamic(
  () => import('@/components/features/charts/HighInterestProductChart'),
  { ssr: false, loading: LoadingPlaceholder }
);

export const InterestRateDistributionChart = dynamic(
  () => import('@/components/features/charts/InterestRateDistributionChart'),
  { ssr: false, loading: LoadingPlaceholder }
);

export const DebtCollectionChart = dynamic(
  () => import('@/components/features/charts/DebtCollectionChart'),
  { ssr: false, loading: LoadingPlaceholder }
);

export const CreativeImpactChart = dynamic(
  () => import('@/components/features/charts/CreativeImpactChart'),
  { ssr: false, loading: LoadingPlaceholder }
);
