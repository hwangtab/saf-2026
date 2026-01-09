'use client';

import { ReactNode } from 'react';
import { useChartDimensions } from '@/lib/hooks/useChartDimensions';

interface ChartDimensions {
  isMobile: boolean;
  pieOuterRadius: number;
  pieInnerRadius: number;
  yAxisWidth: number;
  tickFontSize: number;
  chartMargin: { top: number; right: number; left: number; bottom: number };
}

interface ChartContainerProps {
  title: string;
  ariaLabel: string;
  description: string;
  children: (dimensions: ChartDimensions) => ReactNode;
}

const ChartSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow-sm h-full min-h-[400px] animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-100 rounded"></div>
  </div>
);

export default function ChartContainer({
  title,
  ariaLabel,
  description,
  children,
}: ChartContainerProps) {
  const dimensions = useChartDimensions();

  if (!dimensions) return <ChartSkeleton />;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm" role="img" aria-label={ariaLabel}>
      <h3 className="text-card-title mb-4">{title}</h3>
      {children(dimensions)}
      <p className="text-sm text-charcoal-muted mt-4 text-center">{description}</p>
    </div>
  );
}
