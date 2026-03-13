'use client';

import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale } from 'next-intl';
import ChartContainer from '@/components/ui/ChartContainer';
import { CHART_COLORS } from '@/lib/chartColors';
import { interestRateDistributionData } from '@/content/chart-data';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle } from './chart-styles';

export default memo(function InterestRateDistributionChart() {
  const data = interestRateDistributionData;
  const locale = useLocale();
  const copy =
    locale === 'en'
      ? {
          title: 'Loan interest rate distribution',
          ariaLabel:
            'Loan interest rate distribution: 15 to 20 percent range is highest at 35 respondents, followed by 20 to 30 percent at 32 respondents',
          description: 'More than half are exposed to interest rates above 15 percent.',
          respondentsAxis: 'Respondents',
          respondents: 'Respondents',
        }
      : {
          title: '대출 이자율 분포',
          ariaLabel:
            '대출 이자율 분포: 15~20% 구간이 35명으로 가장 많음, 그 다음 20~30% 구간이 32명',
          description: '절반 이상이 15% 이상의 고리대금에 노출되어 있습니다.',
          respondentsAxis: '응답자 수',
          respondents: '응답자',
        };

  return (
    <ChartContainer title={copy.title} ariaLabel={copy.ariaLabel} description={copy.description}>
      {({ isMobile, tickFontSize }) => (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" tick={{ fontSize: tickFontSize }} />
            <YAxis
              label={
                isMobile
                  ? undefined
                  : { value: copy.respondentsAxis, angle: -90, position: 'insideLeft' }
              }
            />
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
            <Bar dataKey="count" fill={CHART_COLORS.sun} name={copy.respondents} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
});
