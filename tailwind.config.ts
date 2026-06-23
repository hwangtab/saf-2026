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
        // 기본 폰트 (본문) — Pretendard Std Variable (KS X 1001 한글 + Latin).
        // 한자(KS X 1001 미포함)는 시스템 sans fallback chain으로 떨어짐.
        sans: [
          'var(--font-sans)',
          'Pretendard Fallback', // @font-face 보정 fallback — swap 시 한국어 metric 유지
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // 히어로 타이틀 — Pretendard. weight는 globals.css 또는 컴포넌트에서 font-black/font-bold 명시
        display: [
          'var(--font-sans)',
          'Pretendard Fallback',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        // 섹션 제목 — Pretendard Bold (본문 변수 재사용, weight는 globals.css에서 명시)
        section: [
          'var(--font-sans)',
          'Pretendard Fallback',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
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
        // Hero 진입 연출 — 모두 컴포지터 전용(transform/opacity), main thread 0, CLS 0.
        // ken-burns: LCP 이미지가 첫 프레임 scale(1)이라 paint 지연 없음(LCP 무영향).
        // hero-reveal: 텍스트 staggered fade-up. `both` fill + 전역 reduced-motion 0.01ms로 자동 안전.
        'ken-burns': 'kenBurns 20s ease-in-out infinite alternate',
        'hero-reveal': 'heroReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-in': 'toastIn 0.2s ease-out forwards',
        'toast-out': 'toastOut 0.2s ease-out forwards',
        'slide-in-right': 'slideInRight 0.25s ease-out forwards',
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
        // 2026-05-13 CLS 회귀 fix — transform translateY 제거. SSR HTML(opacity-0 class만)과
        // hydration 후(opacity-0 + transform translateY(20px)) mismatch가 큰 element에서
        // CLS 회귀를 일으킴(/special/oh-yoon 0.316 실측). motion-safe 8개 사용처 전부 자동
        // 안전. 디자인 손실: 미세 상승감만 사라지고 0.4s ease-out fade rhythm은 유지.
        fadeInUp: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
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
        // Ken Burns — 느린 줌 + 미세 패닝. 첫 프레임 scale(1) translate(0,0)이라 LCP 시점
        // 이미지가 1:1로 paint → LCP 영향 없음. alternate로 되돌아와 끊김 없이 순환.
        kenBurns: {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '100%': { transform: 'scale(1.1) translate(-2%, -1.2%)' },
        },
        // Hero 텍스트 staggered 등장 — translateY는 transform이라 layout shift(CLS) 없음.
        // fadeInUp(opacity-only)과 별개 키프레임 — 이건 server 정적 클래스로만 적용(hydration
        // 토글 없음)이라 2026-05-13 SSR/hydration mismatch CLS 회귀와 무관.
        heroReveal: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(-20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        toastOut: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-20px) scale(0.95)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '300ms',
        slow: '500ms',
      },
    },
  },
  // @tailwindcss/typography 제거 — 메인 페이지 CSS chunk(02cpdoif8jddz.css 126KB)에서
  // prose 정의가 31KB raw(전체의 24.8%)를 차지했으나 메인은 prose 미사용. typography
  // 사용처(MarkdownRenderer + oh-yoon)는 globals.css의 .markdown-content + 명시적
  // utility로 이전. 결과: 메인 LCP render-blocking CSS 크기 감소.
  plugins: [],
};
export default config;
