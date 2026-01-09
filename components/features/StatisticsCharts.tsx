'use client';

import { memo } from 'react';
import type { CSSProperties } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useChartDimensions } from '@/lib/hooks/useChartDimensions';
import { CHART_COLORS } from '@/lib/chartColors';
import {
  firstBankAccessData,
  rejectionReasonsData,
  highInterestProductData,
  interestRateDistributionData,
  debtCollectionData,
  creativeImpactData,
} from '@/content/chart-data';

const ChartSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow-sm h-full min-h-[400px] animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-100 rounded"></div>
  </div>
);

const tooltipContentStyle: CSSProperties = {
  borderRadius: '0.75rem',
  border: `1px solid ${CHART_COLORS.border}`,
  boxShadow: '0 20px 45px rgba(17, 24, 39, 0.15)',
  backgroundColor: CHART_COLORS.background,
  padding: '12px 16px',
};

const tooltipLabelStyle: CSSProperties = {
  color: CHART_COLORS.textMuted,
  fontWeight: 600,
  fontSize: '0.75rem',
};

const tooltipItemStyle: CSSProperties = {
  color: CHART_COLORS.primary,
  fontWeight: 600,
  fontSize: '0.8rem',
};

export const FirstBankAccessChart = memo(function FirstBankAccessChart() {
  const dimensions = useChartDimensions();
  if (!dimensions) return <ChartSkeleton />;
  const { pieOuterRadius, pieInnerRadius } = dimensions;
  const data = firstBankAccessData;
  const COLORS = [CHART_COLORS.danger, CHART_COLORS.primary];

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-sm"
      role="img"
      aria-label="제1금융권 접근 현황: 예술인의 84.9%가 배제됨, 15.1%만 접근 가능"
    >
      <h3 className="text-card-title mb-4">제1금융권 접근 현황</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={pieInnerRadius}
            outerRadius={pieOuterRadius}
            paddingAngle={5}
            dataKey="value"
            label={({ value }) => `${value}%`}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[data.indexOf(entry)]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${value}%`}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-sm text-charcoal-muted mt-4 text-center">
        예술인의 84.9%가 제1금융권에서 배제되고 있습니다.
      </p>
    </div>
  );
});

export const RejectionReasonsChart = memo(function RejectionReasonsChart() {
  const dimensions = useChartDimensions();
  if (!dimensions) return <ChartSkeleton />;
  const { yAxisWidth, tickFontSize } = dimensions;
  const data = rejectionReasonsData;

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-sm"
      role="img"
      aria-label="대출 거절/포기 주요 사유: 정기 소득 없음 65명, 신용등급 부족 58명, 담보 부족 52명, 고용 불안정 48명, 기타 35명"
    >
      <h3 className="text-card-title mb-4">대출 거절/포기 주요 사유</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            dataKey="reason"
            type="category"
            width={yAxisWidth}
            tick={{ fontSize: tickFontSize }}
          />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Bar dataKey="count" fill={CHART_COLORS.primary} name="응답자 수" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-charcoal-muted mt-4">
        정기적인 소득 입증의 어려움이 가장 큰 이유입니다.
      </p>
    </div>
  );
});

export const HighInterestProductChart = memo(function HighInterestProductChart() {
  const dimensions = useChartDimensions();
  if (!dimensions) return <ChartSkeleton />;
  const { isMobile, tickFontSize } = dimensions;
  const data = highInterestProductData;

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-sm"
      role="img"
      aria-label="고리대금 상품 이용 현황: 카드론 42%, 현금서비스 38%, 소액대출 22%, 사채 15%"
    >
      <h3 className="text-card-title mb-4">고리대금 상품 이용 현황</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="product" tick={{ fontSize: tickFontSize }} />
          <YAxis
            label={
              isMobile ? undefined : { value: '이용률 (%)', angle: -90, position: 'insideLeft' }
            }
          />
          <Tooltip
            formatter={(value) => `${value}%`}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Bar dataKey="percentage" fill={CHART_COLORS.accent} name="이용률" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-charcoal-muted mt-4">
        많은 예술인들이 연 20% 이상의 고리대금 상품을 사용하고 있습니다.
      </p>
    </div>
  );
});

export const InterestRateDistributionChart = memo(function InterestRateDistributionChart() {
  const dimensions = useChartDimensions();
  if (!dimensions) return <ChartSkeleton />;
  const { isMobile, tickFontSize } = dimensions;
  const data = interestRateDistributionData;

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-sm"
      role="img"
      aria-label="대출 이자율 분포: 15~20% 구간이 35명으로 가장 많음, 그 다음 20~30% 구간이 32명"
    >
      <h3 className="text-card-title mb-4">대출 이자율 분포</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" tick={{ fontSize: tickFontSize }} />
          <YAxis
            label={
              isMobile ? undefined : { value: '응답자 수', angle: -90, position: 'insideLeft' }
            }
          />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Bar dataKey="count" fill={CHART_COLORS.sun} name="응답자" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-charcoal-muted mt-4">
        절반 이상이 15% 이상의 고리대금에 노출되어 있습니다.
      </p>
    </div>
  );
});

export const DebtCollectionChart = memo(function DebtCollectionChart() {
  const dimensions = useChartDimensions();
  if (!dimensions) return <ChartSkeleton />;
  const { pieOuterRadius, pieInnerRadius } = dimensions;
  const data = debtCollectionData;
  const COLORS = [CHART_COLORS.danger, CHART_COLORS.charcoal];

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-sm"
      role="img"
      aria-label="채권추심 경험 여부: 경험함 38%, 경험 없음 62%"
    >
      <h3 className="text-card-title mb-4">채권추심 경험 여부</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={pieInnerRadius}
            outerRadius={pieOuterRadius}
            paddingAngle={5}
            dataKey="value"
            label={({ value }) => `${value}%`}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[data.indexOf(entry)]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${value}%`}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-sm text-charcoal-muted mt-4 text-center">
        예술인의 38%가 채권추심 경험을 겪었습니다.
      </p>
    </div>
  );
});

export const CreativeImpactChart = memo(function CreativeImpactChart() {
  const dimensions = useChartDimensions();
  if (!dimensions) return <ChartSkeleton />;
  const { yAxisWidth, tickFontSize, isMobile } = dimensions;
  const data = creativeImpactData;

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-sm"
      role="img"
      aria-label="금융 어려움으로 인한 창작활동 영향: 창작량 감소 68%가 가장 높음, 활동 제한 58%, 품질 저하 52%, 창작 중단 45%"
    >
      <h3 className="text-card-title mb-4">금융 어려움으로 인한 창작활동 영향</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            label={
              isMobile ? undefined : { value: '영향받음 (%)', position: 'insideBottom', offset: -5 }
            }
          />
          <YAxis
            dataKey="impact"
            type="category"
            width={yAxisWidth}
            tick={{ fontSize: tickFontSize }}
          />
          <Tooltip
            formatter={(value) => `${value}%`}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Bar dataKey="percentage" fill={CHART_COLORS.primary} name="비율" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-charcoal-muted mt-4">
        금융 어려움이 예술인들의 창작활동을 심각하게 방해하고 있습니다.
      </p>
    </div>
  );
});
