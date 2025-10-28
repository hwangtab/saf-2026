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
          DEFAULT: '#F6B300', // Honey Gold
          soft: '#FFE9A6', // Honey Tint
          strong: '#D99000', // Amber Core
          surface: '#FFF4D1', // Honey Veil
        },
        charcoal: {
          DEFAULT: '#222326', // Soft Charcoal
          muted: '#3B3C40', // Evening Slate
          soft: '#4E4F52', // Fog Graphite
        },
        accent: {
          DEFAULT: '#2CA6A4', // Modern Teal
          soft: '#7BCDCB', // Seafoam Mist
          strong: '#1E7C7A', // Deep Ocean
        },
        success: '#3BB273',
        warning: '#FFB020',
        danger: '#E15554',
        light: '#FFFFFF',
        gray: {
          50: '#F9F9F8',
          100: '#EFEFEA',
          200: '#E1E2DA',
          300: '#C8C9BC',
          400: '#A4A58F',
          500: '#7A7C64',
          600: '#5C5F4A',
          700: '#45483A',
          800: '#2E3128',
          900: '#1E2119',
        },
      },
      fontFamily: {
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
        watermelon: [
          'Watermelon',
          'GMarketSans',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        partial: [
          'PartialSans',
          'GMarketSans',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
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
