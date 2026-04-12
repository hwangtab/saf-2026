import type { Config } from 'tailwindcss';
import { BRAND_COLORS } from './lib/colors';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ...BRAND_COLORS,
        slate: {}, // slate 팔레트 비활성화 — gray 브랜드 토큰 사용
      },
      fontFamily: {
        // 기본 폰트 - 모든 텍스트에 사용
        sans: [
          'var(--font-paperlogy)',
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
          'var(--font-partial-sans)',
          'var(--font-paperlogy)',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        // 섹션 제목 전용
        section: [
          'var(--font-section)',
          'var(--font-paperlogy)',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'gradient-portal': 'radial-gradient(circle at top, #EDF3FF 0%, #F7F8FA 38%, #FFFFFF 100%)',
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'zoom-in-95': 'zoomIn95 0.2s ease-out forwards',
        stamp: 'stampIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'hero-breathing': 'heroBreathing 40s ease-in-out infinite',
        'toast-in': 'toastIn 0.2s ease-out forwards',
        'toast-out': 'toastOut 0.2s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        zoomIn95: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        stampIn: {
          '0%': { opacity: '0', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        heroBreathing: {
          '0%, 100%': { transform: 'scale(1.1)' },
          '50%': { transform: 'scale(1.0)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(-20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        toastOut: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-20px) scale(0.95)' },
        },
      },
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '300ms',
        slow: '500ms',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
