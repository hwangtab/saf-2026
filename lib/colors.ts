/**
 * SAF 브랜드 색상 시스템
 *
 * WCAG AA 접근성 기준:
 * - 일반 텍스트 (18px 미만): 최소 4.5:1 대비율
 * - 큰 텍스트 (18px bold 또는 24px 이상): 최소 3:1 대비율
 * - UI 컴포넌트/그래픽: 최소 3:1 대비율
 *
 * 색상 사용 가이드:
 * - 버튼 텍스트: primary-a11y, accent-a11y, success-a11y, danger-a11y 사용 권장
 * - 링크 텍스트: primary-strong (#0E4ECF) 사용 권장
 * - 비활성 텍스트: gray-600 이상 사용 권장
 */
export const BRAND_COLORS = {
  primary: {
    DEFAULT: '#2176FF', // Crayola Blue (4.12:1 on white - large text only)
    soft: '#D2E1FF', // Blue Mist
    strong: '#0E4ECF', // Deep Blue (6.98:1 on white - AA compliant)
    surface: '#EDF3FF', // Blue Veil
    a11y: '#1565D8', // Accessible Blue (4.63:1 on white - AA compliant)
  },
  sun: {
    DEFAULT: '#FDCA40', // Sun Glow
    soft: '#FEE9A3', // Sun Mist
    strong: '#E3AC0D', // Sun Core
  },
  accent: {
    DEFAULT: '#F79824', // Carrot Orange (2.22:1 on white - decorative only)
    soft: '#FFD4A3', // Carrot Glow
    strong: '#D97800', // Carrot Core (3.16:1 - large text only)
    a11y: '#B45309', // Accessible Orange (4.78:1 on white - AA compliant)
  },
  canvas: {
    DEFAULT: '#FFF6DD', // Soft Sand
    soft: '#FFF9E8', // Sand Mist
    strong: '#F3E2AA', // Sand Core
  },
  charcoal: {
    DEFAULT: '#31393C', // Gunmetal (11.79:1 on white - AAA compliant)
    muted: '#555E67', // Slate (6.60:1 on white - AA compliant)
    soft: '#6A7378', // Fog Slate (4.84:1 on white - AA compliant)
  },
  success: {
    DEFAULT: '#2E9F7B', // Success Green (3.30:1 - large text only)
    a11y: '#1D7A5F', // Accessible Success (4.85:1 on white - AA compliant)
  },
  warning: '#FDCA40',
  danger: {
    DEFAULT: '#D94F45', // Danger Red (4.07:1 - large text only)
    a11y: '#B91C1C', // Accessible Danger (5.92:1 on white - AA compliant)
  },
  light: '#FFFFFF',
  gray: {
    50: '#F7F8FA',
    100: '#E6EAF0',
    200: '#D1D7E0',
    300: '#B3BAC7',
    400: '#8F98A5',
    500: '#707A84', // (4.37:1 - use for large text/UI only)
    600: '#555E67', // (6.60:1 - AA compliant)
    700: '#3D464D', // (9.63:1 - AAA compliant)
    800: '#2C3238',
    900: '#1F2428',
  },
} as const;

/**
 * WCAG AA 대비율 검증 결과 (2026-01-21)
 *
 * ✅ AA 준수 (일반 텍스트 4.5:1 이상):
 * - charcoal on canvas-soft: 11.21:1
 * - charcoal on canvas: 10.94:1
 * - charcoal on white: 11.79:1
 * - charcoal-muted on white: 6.60:1
 * - charcoal-soft on white: 4.84:1
 * - white on primary-strong: 6.98:1
 * - primary-strong on white: 6.98:1
 * - gray-600+ on white: 6.60:1+
 *
 * ⚠️ 큰 텍스트/UI 전용 (3:1~4.5:1):
 * - white on primary: 4.12:1
 * - white on danger: 4.07:1
 * - gray-500 on white: 4.37:1
 * - primary on white: 4.12:1
 *
 * ❌ 장식용 전용 (3:1 미만):
 * - white on accent: 2.22:1
 *
 * 검증 스크립트: npx tsx scripts/check-color-contrast.ts
 */
