import { CSSProperties } from 'react';
import { CHART_COLORS } from '@/lib/chartColors';

export const tooltipContentStyle: CSSProperties = {
  borderRadius: '0.75rem',
  border: `1px solid ${CHART_COLORS.border}`,
  boxShadow: '0 20px 45px rgba(17, 24, 39, 0.15)',
  backgroundColor: CHART_COLORS.background,
  padding: '12px 16px',
};

export const tooltipLabelStyle: CSSProperties = {
  color: CHART_COLORS.textMuted,
  fontWeight: 600,
  fontSize: '0.75rem',
};

export const tooltipItemStyle: CSSProperties = {
  color: CHART_COLORS.primary,
  fontWeight: 600,
  fontSize: '0.8rem',
};
