'use client';

import { memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale } from 'next-intl';
import ChartContainer from '@/components/ui/ChartContainer';
import { CHART_COLORS } from '@/lib/chartColors';
import { debtCollectionData } from '@/content/chart-data';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle } from './chart-styles';

export default memo(function DebtCollectionChart() {
  const locale = useLocale();
  const data =
    locale === 'en'
      ? debtCollectionData.map((entry) => ({
          ...entry,
          name: entry.name === '경험함' ? 'Experienced' : 'No experience',
        }))
      : debtCollectionData;
  const copy =
    locale === 'en'
      ? {
          title: 'Debt collection experience',
          ariaLabel: 'Debt collection experience: experienced 38 percent, no experience 62 percent',
          description: '38 percent of artists have experienced debt collection pressure.',
        }
      : {
          title: '채권추심 경험 여부',
          ariaLabel: '채권추심 경험 여부: 경험함 38%, 경험 없음 62%',
          description: '예술인의 38%가 채권추심 경험을 겪었습니다.',
        };
  const COLORS = [CHART_COLORS.danger, CHART_COLORS.charcoal];

  return (
    <ChartContainer title={copy.title} ariaLabel={copy.ariaLabel} description={copy.description}>
      {({ pieInnerRadius, pieOuterRadius }) => (
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
      )}
    </ChartContainer>
  );
});
