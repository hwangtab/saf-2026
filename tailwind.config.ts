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
          DEFAULT: '#799EFF', // Azure Bloom
          soft: '#D5E0FF', // Azure Mist
          strong: '#4F78F4', // Azure Core
          surface: '#EEF3FF', // Azure Veil
        },
        accent: {
          DEFAULT: '#FFBC4C', // Amber Bloom
          soft: '#FFE0A8', // Amber Glow
          strong: '#E29D2E', // Amber Core
        },
        highlight: {
          DEFAULT: '#FFDE63', // Golden Beam
          soft: '#FFF1B5', // Golden Haze
          strong: '#FFCA24', // Golden Core
        },
        canvas: {
          DEFAULT: '#FEFFC4', // Soft Canary
          soft: '#FFF9E0', // Canary Mist
          strong: '#F0F48C', // Canary Core
        },
        charcoal: {
          DEFAULT: '#2F2C33', // Night Ink
          muted: '#484551', // Soft Slate
          soft: '#6B6774', // Mist Slate
        },
        success: '#4CAF6D',
        warning: '#FFCA24',
        danger: '#E05858',
        light: '#FFFFFF',
        gray: {
          50: '#F9FAFF',
          100: '#EEF1FF',
          200: '#E0E5F5',
          300: '#CBD0E4',
          400: '#AEB5CD',
          500: '#8E94B0',
          600: '#6F7592',
          700: '#555A75',
          800: '#3C4157',
          900: '#2A2E3C',
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
