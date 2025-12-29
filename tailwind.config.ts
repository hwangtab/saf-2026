import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2176FF', // Crayola Blue
          soft: '#D2E1FF', // Blue Mist
          strong: '#0E4ECF', // Deep Blue
          surface: '#EDF3FF', // Blue Veil
        },
        sky: {
          DEFAULT: '#33A1FD', // Celestial Blue
          soft: '#CDE9FF', // Sky Mist
          strong: '#0F7FDB', // Sky Core
        },
        sun: {
          DEFAULT: '#FDCA40', // Sun Glow
          soft: '#FEE9A3', // Sun Mist
          strong: '#E3AC0D', // Sun Core
        },
        accent: {
          DEFAULT: '#F79824', // Carrot Orange
          soft: '#FFD4A3', // Carrot Glow
          strong: '#D97800', // Carrot Core
        },
        canvas: {
          DEFAULT: '#FFF6DD', // Soft Sand
          soft: '#FFF9E8', // Sand Mist
          strong: '#F3E2AA', // Sand Core
        },
        charcoal: {
          DEFAULT: '#31393C', // Gunmetal
          muted: '#555E67', // Slate (개선: 더 어두워져 대비 향상)
          soft: '#6A7378', // Fog Slate
        },
        success: '#2E9F7B',
        warning: '#FDCA40',
        danger: '#D94F45',
        light: '#FFFFFF',
        gray: {
          50: '#F7F8FA',
          100: '#E6EAF0',
          200: '#D1D7E0',
          300: '#B3BAC7',
          400: '#8F98A5',
          500: '#707A84',
          600: '#555E67',
          700: '#3D464D',
          800: '#2C3238',
          900: '#1F2428',
        },
      },
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
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
