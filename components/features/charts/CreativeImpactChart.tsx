'use client';

import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale } from 'next-intl';
import ChartContainer from '@/components/ui/ChartContainer';
import { CHART_COLORS } from '@/lib/chartColors';
import { creativeImpactData } from '@/content/chart-data';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle } from './chart-styles';

export default memo(function CreativeImpactChart() {
  const locale = useLocale();
  const data =
    locale === 'en'
      ? creativeImpactData.map((entry) => ({
          ...entry,
          impact:
            entry.impact === '창작 중단'
              ? 'Stopped creating'
              : entry.impact === '창작량 감소'
                ? 'Reduced output'
                : entry.impact === '품질 저하'
                  ? 'Lower quality'
                  : 'Activity constraints',
        }))
      : creativeImpactData;
  const copy =
    locale === 'en'
      ? {
          title: 'Impact on creative work due to financial hardship',
          ariaLabel:
            'Impact on creative work: reduced output 68 percent, activity constraints 58 percent, lower quality 52 percent, stopped creating 45 percent',
          description: 'Financial hardship severely disrupts artistic creation.',
          affectedAxis: 'Affected (%)',
          ratio: 'Ratio',
        }
      : {
          title: '금융 어려움으로 인한 창작활동 영향',
          ariaLabel:
            '금융 어려움으로 인한 창작활동 영향: 창작량 감소 68%가 가장 높음, 활동 제한 58%, 품질 저하 52%, 창작 중단 45%',
          description: '금융 어려움이 예술인들의 창작활동을 심각하게 방해하고 있습니다.',
          affectedAxis: '영향받음 (%)',
          ratio: '비율',
        };

  return (
    <ChartContainer title={copy.title} ariaLabel={copy.ariaLabel} description={copy.description}>
      {({ yAxisWidth, tickFontSize, isMobile }) => (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              label={
                isMobile
                  ? undefined
                  : { value: copy.affectedAxis, position: 'insideBottom', offset: -5 }
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
            <Bar dataKey="percentage" fill={CHART_COLORS.primary} name={copy.ratio} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
});
