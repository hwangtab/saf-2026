'use client';

import { memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale } from 'next-intl';
import ChartContainer from '@/components/ui/ChartContainer';
import { CHART_COLORS } from '@/lib/chartColors';
import { firstBankAccessData } from '@/content/chart-data';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle } from './chart-styles';

export default memo(function FirstBankAccessChart() {
  const locale = useLocale();
  const data =
    locale === 'en'
      ? firstBankAccessData.map((entry) => ({
          ...entry,
          name: entry.name === '제1금융권 배제' ? 'Excluded from primary banking' : 'Accessible',
        }))
      : firstBankAccessData;
  const copy =
    locale === 'en'
      ? {
          title: 'Primary banking access',
          ariaLabel:
            'Primary banking access: 84.9 percent of artists excluded, 15.1 percent accessible',
          description: '84.9 percent of artists are excluded from primary banking institutions.',
        }
      : {
          title: '제1금융권 접근 현황',
          ariaLabel: '제1금융권 접근 현황: 예술인의 84.9%가 배제됨, 15.1%만 접근 가능',
          description: '예술인의 84.9%가 제1금융권에서 배제되고 있습니다.',
        };
  const COLORS = [CHART_COLORS.danger, CHART_COLORS.primary];

  return (
    <ChartContainer title={copy.title} ariaLabel={copy.ariaLabel} description={copy.description}>
      {({ pieOuterRadius, pieInnerRadius }) => (
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
