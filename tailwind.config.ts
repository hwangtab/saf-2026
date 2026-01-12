import type { Config } from 'tailwindcss';

import { BRAND_COLORS } from './lib/colors';

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
