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

interface DataTableRow {
  label: string;
  value: string;
}

interface ChartContainerProps {
  title: string;
  ariaLabel: string;
  description: string;
  children: (dimensions: ChartDimensions) => ReactNode;
  /** Unique ID for the chart container, used for aria-describedby linking */
  id?: string;
  /** ID of an external description element to link via aria-describedby */
  descriptionId?: string;
  /** Data table for screen reader users (visually hidden) */
  dataTable?: DataTableRow[];
}

const ChartSkeleton = () => (
  <div
    className="bg-white p-6 rounded-lg shadow-sm h-full min-h-[400px] animate-pulse"
    role="status"
    aria-busy="true"
    aria-label="차트를 로드하는 중입니다"
  >
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-100 rounded"></div>
  </div>
);

export default function ChartContainer({
  title,
  ariaLabel,
  description,
  children,
  id,
  descriptionId,
  dataTable,
}: ChartContainerProps) {
  const dimensions = useChartDimensions();

  if (!dimensions) return <ChartSkeleton />;

  const descriptionElementId = id ? `${id}-description` : undefined;
  const ariaDescribedBy =
    [descriptionId, descriptionElementId].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-sm"
      role="img"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      id={id}
    >
      <h3 className="text-card-title mb-4">{title}</h3>
      {children(dimensions)}
      <p id={descriptionElementId} className="text-sm text-charcoal-muted mt-4 text-center">
        {description}
      </p>

      {/* Screen reader only data table */}
      {dataTable && dataTable.length > 0 && (
        <table className="sr-only">
          <caption>{title} 데이터 테이블</caption>
          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col">값</th>
            </tr>
          </thead>
          <tbody>
            {dataTable.map((row, index) => (
              <tr key={index}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
