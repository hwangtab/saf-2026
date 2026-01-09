'use client';

import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartContainer from '@/components/ui/ChartContainer';
import { CHART_COLORS } from '@/lib/chartColors';
import { highInterestProductData } from '@/content/chart-data';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle } from './chart-styles';

export default memo(function HighInterestProductChart() {
  const data = highInterestProductData;

  return (
    <ChartContainer
      title="고리대금 상품 이용 현황"
      ariaLabel="고리대금 상품 이용 현황: 카드론 42%, 현금서비스 38%, 소액대출 22%, 사채 15%"
      description="많은 예술인들이 연 20% 이상의 고리대금 상품을 사용하고 있습니다."
    >
      {({ isMobile, tickFontSize }) => (
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
      )}
    </ChartContainer>
  );
});
