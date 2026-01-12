import { BRAND_COLORS } from '@/lib/colors';

export const CHART_COLORS = {
  primary: BRAND_COLORS.primary.DEFAULT,
  accent: BRAND_COLORS.accent.DEFAULT,
  sun: BRAND_COLORS.sun.DEFAULT,
  danger: BRAND_COLORS.danger,
  charcoal: BRAND_COLORS.charcoal.DEFAULT,
  charcoalMuted: BRAND_COLORS.charcoal.muted,
  border: BRAND_COLORS.gray[100],
  background: BRAND_COLORS.light,
  textMain: BRAND_COLORS.charcoal.DEFAULT,
  textMuted: BRAND_COLORS.charcoal.muted,
} as const;
