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
        // 기본 폰트 (본문) — Noto Sans KR
        sans: [
          'var(--font-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // 히어로 타이틀 — Noto Sans KR. weight는 globals.css 또는 컴포넌트에서 font-black/font-bold 명시
        display: [
          'var(--font-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        // 섹션 제목 — Noto Sans KR Bold (본문 변수 재사용, weight는 globals.css에서 명시)
        section: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-portal': 'radial-gradient(circle at top, #EDF3FF 0%, #F7F8FA 38%, #FFFFFF 100%)',
      },
      boxShadow: {
        // Gallery white cube — 다층 stack으로 자연광 같은 부드러운 깊이 (Apple/Notion 모델)
        'gallery-artwork': '0 20px 40px -12px rgba(0,0,0,0.10), 0 6px 14px -6px rgba(0,0,0,0.05)',
        'gallery-hover': '0 30px 60px -15px rgba(0,0,0,0.14), 0 10px 24px -8px rgba(0,0,0,0.06)',
        'gallery-card':
          '0 4px 18px rgba(0,0,0,0.04), 0 2px 7.85px rgba(0,0,0,0.027), 0 0.8px 2.93px rgba(0,0,0,0.02)',
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
