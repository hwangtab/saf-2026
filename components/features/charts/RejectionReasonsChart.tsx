'use client';

import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale } from 'next-intl';
import ChartContainer from '@/components/ui/ChartContainer';
import { CHART_COLORS } from '@/lib/chartColors';
import { rejectionReasonsData } from '@/content/chart-data';
import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle } from './chart-styles';

export default memo(function RejectionReasonsChart() {
  const locale = useLocale();
  const data =
    locale === 'en'
      ? rejectionReasonsData.map((entry) => ({
          ...entry,
          reason:
            entry.reason === '정기 소득 없음'
              ? 'No regular income'
              : entry.reason === '신용등급 부족'
                ? 'Insufficient credit score'
                : entry.reason === '담보 부족'
                  ? 'Insufficient collateral'
                  : entry.reason === '고용 불안정'
                    ? 'Unstable employment'
                    : 'Other',
        }))
      : rejectionReasonsData;
  const copy =
    locale === 'en'
      ? {
          title: 'Key reasons for loan rejection or withdrawal',
          ariaLabel:
            'Main reasons for rejection or withdrawal: no regular income 65, insufficient credit score 58, insufficient collateral 52, unstable employment 48, other 35',
          description: 'Difficulty proving regular income is the largest barrier.',
          respondents: 'Respondents',
        }
      : {
          title: '대출 거절/포기 주요 사유',
          ariaLabel:
            '대출 거절/포기 주요 사유: 정기 소득 없음 65명, 신용등급 부족 58명, 담보 부족 52명, 고용 불안정 48명, 기타 35명',
          description: '정기적인 소득 입증의 어려움이 가장 큰 이유입니다.',
          respondents: '응답자 수',
        };

  return (
    <ChartContainer title={copy.title} ariaLabel={copy.ariaLabel} description={copy.description}>
      {({ yAxisWidth, tickFontSize }) => (
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
            <Bar dataKey="count" fill={CHART_COLORS.primary} name={copy.respondents} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
});
