import type { Config } from 'tailwindcss';

/**
 * WCAG AA 접근성 준수 색상 시스템
 * - a11y 변형: 일반 텍스트 대비율 4.5:1 이상 보장
 * - 자세한 대비율은 lib/colors.ts 참조
 */
const BRAND_COLORS = {
  primary: {
    DEFAULT: '#2176FF', // Crayola Blue (4.12:1 - large text)
    soft: '#D2E1FF', // Blue Mist
    strong: '#0E4ECF', // Deep Blue (6.98:1 - AA)
    surface: '#EDF3FF', // Blue Veil
    a11y: '#1565D8', // Accessible Blue (4.63:1 - AA)
  },
  sun: {
    DEFAULT: '#FDCA40', // Sun Glow
    soft: '#FEE9A3', // Sun Mist
    strong: '#E3AC0D', // Sun Core
  },
  accent: {
    DEFAULT: '#F79824', // Carrot Orange (decorative)
    soft: '#FFD4A3', // Carrot Glow
    strong: '#D97800', // Carrot Core (large text)
    a11y: '#B45309', // Accessible Orange (4.78:1 - AA)
  },
  canvas: {
    DEFAULT: '#FFF6DD', // Soft Sand
    soft: '#FFF9E8', // Sand Mist
    strong: '#F3E2AA', // Sand Core
  },
  charcoal: {
    DEFAULT: '#31393C', // Gunmetal (11.79:1 - AAA)
    muted: '#555E67', // Slate (6.60:1 - AA)
    soft: '#6A7378', // Fog Slate (4.84:1 - AA)
  },
  success: {
    DEFAULT: '#2E9F7B', // Success Green (large text)
    a11y: '#1D7A5F', // Accessible Success (4.85:1 - AA)
  },
  warning: '#FDCA40',
  danger: {
    DEFAULT: '#D94F45', // Danger Red (large text)
    a11y: '#B91C1C', // Accessible Danger (5.92:1 - AA)
  },
  light: '#FFFFFF',
  gray: {
    50: '#F7F8FA',
    100: '#E6EAF0',
    200: '#D1D7E0',
    300: '#B3BAC7',
    400: '#8F98A5',
    500: '#707A84', // large text/UI only
    600: '#555E67', // AA compliant
    700: '#3D464D', // AAA compliant
    800: '#2C3238',
    900: '#1F2428',
  },
};

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: BRAND_COLORS,
      fontFamily: {
        // 기본 폰트 - 모든 텍스트에 사용
        sans: [
          'GMarketSans',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // 히어로 타이틀 전용
        display: [
          'PartialSans',
          'GMarketSans',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        // 섹션 제목 전용
        section: [
          'SchoolSafetyPoster',
          'GMarketSans',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '300ms',
        slow: '500ms',
      },
    },
  },
  plugins: [],
};
export default config;
