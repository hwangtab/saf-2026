'use client';

import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale } from 'next-intl';
import ChartContainer from '@/components/ui/ChartContainer';
import { CHART_COLORS } from '@/lib/chartColors';
import { highInterestProductData } from '@/content/chart-data';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle } from './chart-styles';

export default memo(function HighInterestProductChart() {
  const locale = useLocale();
  const data =
    locale === 'en'
      ? highInterestProductData.map((entry) => ({
          ...entry,
          product:
            entry.product === '카드론'
              ? 'Card loan'
              : entry.product === '현금서비스'
                ? 'Cash advance'
                : entry.product === '소액대출'
                  ? 'Microloan'
                  : 'Private loan',
        }))
      : highInterestProductData;
  const copy =
    locale === 'en'
      ? {
          title: 'Predatory loan product usage',
          ariaLabel:
            'Predatory loan product usage: card loan 42 percent, cash advance 38 percent, microloan 22 percent, private loan 15 percent',
          description: 'Many artists rely on products with annual interest above 20 percent.',
          usageRateAxis: 'Usage rate (%)',
          usageRate: 'Usage rate',
        }
      : {
          title: '고리대금 상품 이용 현황',
          ariaLabel: '고리대금 상품 이용 현황: 카드론 42%, 현금서비스 38%, 소액대출 22%, 사채 15%',
          description: '많은 예술인들이 연 20% 이상의 고리대금 상품을 사용하고 있습니다.',
          usageRateAxis: '이용률 (%)',
          usageRate: '이용률',
        };

  return (
    <ChartContainer title={copy.title} ariaLabel={copy.ariaLabel} description={copy.description}>
      {({ isMobile, tickFontSize }) => (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="product" tick={{ fontSize: tickFontSize }} />
            <YAxis
              label={
                isMobile
                  ? undefined
                  : { value: copy.usageRateAxis, angle: -90, position: 'insideLeft' }
              }
            />
            <Tooltip
              formatter={(value) => `${value}%`}
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
            <Bar dataKey="percentage" fill={CHART_COLORS.accent} name={copy.usageRate} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
});
