import { BRAND_COLORS } from '@/lib/colors';

// Gallery White Cube edition: 차트도 chrome 무채색 원칙 따름.
// 공개 차트(/our-reality 등)는 primary 블루 + charcoal 다크 + danger 빨강(의미적)으로 구분.
// sun/accent 키는 호환을 위해 유지하되 갤러리 톤으로 redirect.
export const CHART_COLORS = {
  primary: BRAND_COLORS.primary.DEFAULT,
  accent: BRAND_COLORS.primary.strong, // was accent (orange) → deeper blue
  sun: BRAND_COLORS.charcoal.DEFAULT, // was sun (yellow) → dark monochrome
  danger: BRAND_COLORS.danger.DEFAULT,
  charcoal: BRAND_COLORS.charcoal.DEFAULT,
  charcoalMuted: BRAND_COLORS.charcoal.muted,
  border: BRAND_COLORS.gray[100],
  background: BRAND_COLORS.light,
  textMain: BRAND_COLORS.charcoal.DEFAULT,
  textMuted: BRAND_COLORS.charcoal.muted,
} as const;
