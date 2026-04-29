/**
 * SAF 브랜드 색상 시스템 — Gallery White Cube edition (2026-04-29 리뉴얼)
 *
 * 정체성: 현대미술 작품 판매 사이트. "interface chrome is colorless, color comes only from artworks."
 * Apple/Figma의 white gallery wall 모델 적용.
 *
 * WCAG AA 접근성 기준:
 * - 일반 텍스트 (18px 미만): 최소 4.5:1 대비율
 * - 큰 텍스트 (18px bold 또는 24px 이상): 최소 3:1 대비율
 * - UI 컴포넌트/그래픽: 최소 3:1 대비율
 *
 * 색상 역할 (갤러리 모델):
 * - 모든 배경: canvas / gallery-* 화이트 스케일 (작품 색이 왜곡되지 않도록)
 * - 단일 액센트: primary 블루 — CTA, 링크 모두 통일
 * - 텍스트: charcoal-deep / charcoal / charcoal-muted
 * - 통계/숫자 강조 한정: sun (chrome 배경으로는 사용 금지)
 * - accent(테라코타) 토큰은 deprecated — 신규 코드에서 사용하지 말 것 (Button accent variant도 primary로 이전 예정)
 */
export const BRAND_COLORS = {
  primary: {
    DEFAULT: '#2176FF', // Crayola Blue (4.12:1 on white - large text only)
    soft: '#D2E1FF', // Blue Mist
    strong: '#0E4ECF', // Deep Blue (6.98:1 on white - AA compliant)
    surface: '#EDF3FF', // Blue Veil
    a11y: '#1565D8', // Accessible Blue (4.63:1 on white - AA compliant)
  },
  /**
   * Highlight 전용. 가격·통계 숫자 강조에만 사용.
   * 갤러리 모델에서는 chrome 배경(bg-sun, bg-sun-soft)으로 사용 금지 — 작품 색과 충돌.
   * 텍스트 강조(text-sun-strong)만 허용.
   */
  sun: {
    DEFAULT: '#FDCA40', // Sun Glow
    soft: '#FEE9A3', // Sun Mist
    strong: '#E3AC0D', // Sun Core
  },
  /**
   * @deprecated Gallery White Cube 리뉴얼 후 사용 금지. CTA는 primary로 통일.
   * 기존 사용처가 단계적으로 primary로 이전되는 동안 임시로 유지.
   */
  accent: {
    DEFAULT: '#F79824', // Carrot Orange (2.22:1 on white - decorative only)
    soft: '#FFD4A3', // Carrot Glow
    strong: '#D97800', // Carrot Core (3.16:1 - large text only)
    a11y: '#B45309', // Accessible Orange (4.78:1 on white - AA compliant)
  },
  /**
   * Gallery white scale. 기존 토큰 이름(canvas/canvas-soft/canvas-strong) 유지하되
   * hex 값을 화이트 스케일로 리다이렉트 — 96개 파일 자동 마이그레이션.
   *
   * 의미 매핑:
   * - canvas.DEFAULT (구 Soft Sand)  → Gallery Pearl (미세한 농담 차로 챕터 분리)
   * - canvas.soft (구 Sand Mist, body bg) → Gallery Canvas (순백 갤러리 벽)
   * - canvas.strong (구 Sand Core)   → Gallery Parchment (대안 챕터)
   */
  canvas: {
    DEFAULT: '#FAFAFC', // Gallery Pearl
    soft: '#FFFFFF', // Gallery Canvas (body bg)
    strong: '#F5F5F7', // Gallery Parchment
  },
  /**
   * Gallery 명시 토큰. 새 코드는 이쪽 사용 권장 — 의미가 분명함.
   * canvas-* alias로 동일 값 — 점진 마이그레이션용.
   */
  gallery: {
    canvas: '#FFFFFF', // 순백 갤러리 벽 (= canvas.soft)
    pearl: '#FAFAFC', // 미세 농담 챕터 (= canvas.DEFAULT)
    parchment: '#F5F5F7', // 대안 챕터 (= canvas.strong)
    hairline: '#E0E0E0', // 작품 카드 1px border
    divider: '#F0F0F0', // 섹션 divider
    tile: '#1F2428', // 다크 챕터 단색 (= charcoal.deep)
  },
  charcoal: {
    DEFAULT: '#31393C', // Gunmetal (11.79:1 on white - AAA compliant)
    deep: '#1F2428', // Deep Gunmetal (14.68:1 on white - AAA compliant)
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
 * WCAG AA 대비율 검증 결과 (2026-04-29 갤러리 리뉴얼 후)
 *
 * canvas 토큰이 화이트 스케일로 리다이렉트되어 모든 대비율이 "on white" 기준과 동일.
 *
 * ✅ AA 준수 (일반 텍스트 4.5:1 이상):
 * - charcoal on canvas-soft (#FFFFFF): 11.79:1
 * - charcoal on canvas (#FAFAFC): ~11.7:1
 * - charcoal on canvas-strong (#F5F5F7): ~11.4:1
 * - charcoal on white: 11.79:1
 * - white on charcoal-deep: 14.68:1
 * - charcoal-deep on white: 14.68:1
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
