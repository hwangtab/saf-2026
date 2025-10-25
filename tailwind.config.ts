import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#F4D03F', // 따뜻한 노란색 (희망과 연대)
        dark: '#1a1a1a',
        light: '#ffffff',
        gray: {
          50: '#fafafa',
          100: '#f3f3f3',
          200: '#e6e6e6',
          300: '#d1d1d1',
          400: '#a0a0a0',
          500: '#808080',
          600: '#606060',
          700: '#404040',
          800: '#262626',
          900: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Pretendard',
          'SUIT',
          'sans-serif',
        ],
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
    },
  },
  plugins: [],
};
export default config;
