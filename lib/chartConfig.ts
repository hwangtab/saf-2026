import type { CSSProperties } from 'react';

/**
 * Chart color palette for consistent styling across charts.
 */
export const CHART_COLORS = {
  primary: '#4F46E5',
  primaryMuted: 'rgba(79, 70, 229, 0.1)',
  danger: '#DC2626',
  dangerMuted: 'rgba(220, 38, 38, 0.1)',
  charcoal: '#374151',
  charcoalMuted: '#6B7280',
  textMuted: '#6B7280',
} as const;

/**
 * Shared tooltip label style for Recharts.
 */
export const tooltipLabelStyle: CSSProperties = {
  color: CHART_COLORS.textMuted,
  fontWeight: 600,
  fontSize: '0.75rem',
};

/**
 * Shared tooltip item style for Recharts.
 */
export const tooltipItemStyle: CSSProperties = {
  color: CHART_COLORS.primary,
  fontWeight: 600,
  fontSize: '0.8rem',
};

/**
 * Creates consistent Tooltip props for Recharts.
 */
export const getTooltipProps = () => ({
  labelStyle: tooltipLabelStyle,
  itemStyle: tooltipItemStyle,
  contentStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  } as CSSProperties,
});
