'use client';

import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartContainer from '@/components/ui/ChartContainer';
import { CHART_COLORS } from '@/lib/chartColors';
import { creativeImpactData } from '@/content/chart-data';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle } from './chart-styles';

export default memo(function CreativeImpactChart() {
  const data = creativeImpactData;

  return (
    <ChartContainer
      title="금융 어려움으로 인한 창작활동 영향"
      ariaLabel="금융 어려움으로 인한 창작활동 영향: 창작량 감소 68%가 가장 높음, 활동 제한 58%, 품질 저하 52%, 창작 중단 45%"
      description="금융 어려움이 예술인들의 창작활동을 심각하게 방해하고 있습니다."
    >
      {({ yAxisWidth, tickFontSize, isMobile }) => (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              label={
                isMobile
                  ? undefined
                  : { value: '영향받음 (%)', position: 'insideBottom', offset: -5 }
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
      )}
    </ChartContainer>
  );
});
