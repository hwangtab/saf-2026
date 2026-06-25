import { BRAND_COLORS } from '@/lib/colors';

// Gallery White Cube edition: 차트도 chrome 무채색 원칙 따름.
// 공개 차트(/our-reality 등)는 단일 시리즈 막대 = primary 블루로 통일,
// 파이는 [danger 빨강(경고 통계), primary 블루(보완)]로 구분.
// (구 accent/sun 호환 키는 오해 소지가 있어 제거 — primary/charcoal을 직접 사용)
export const CHART_COLORS = {
  primary: BRAND_COLORS.primary.DEFAULT,
  danger: BRAND_COLORS.danger.DEFAULT,
  charcoal: BRAND_COLORS.charcoal.DEFAULT,
  charcoalMuted: BRAND_COLORS.charcoal.muted,
  border: BRAND_COLORS.gray[100],
  background: BRAND_COLORS.light,
  textMain: BRAND_COLORS.charcoal.DEFAULT,
  textMuted: BRAND_COLORS.charcoal.muted,
} as const;
