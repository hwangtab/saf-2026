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
          DEFAULT: '#BADFDB', // Soft Teal
          soft: '#E3F2F2', // Teal Mist
          strong: '#7FBFBB', // Teal Core
          surface: '#F0FAF9', // Teal Veil
        },
        accent: {
          DEFAULT: '#FFA4A4', // Blossom Coral
          soft: '#FFD6D6', // Blossom Glow
          strong: '#FF7C7C', // Blossom Core
        },
        highlight: {
          DEFAULT: '#FFBDBD', // Petal Blush
          soft: '#FFE3E3', // Petal Mist
          strong: '#FF9090', // Petal Core
        },
        canvas: {
          DEFAULT: '#FCF9EA', // Vanilla Cream
          soft: '#FFFCF2', // Vanilla Light
          strong: '#F3ECD4', // Vanilla Core
        },
        charcoal: {
          DEFAULT: '#2D2A29', // Soft Ink
          muted: '#4F4A48', // Warm Slate
          soft: '#736C6A', // Mist Slate
        },
        success: '#7EB28A',
        warning: '#FFA4A4',
        danger: '#FF7C7C',
        light: '#FFFFFF',
        gray: {
          50: '#FEFCF7',
          100: '#F8F2E9',
          200: '#EEE3D4',
          300: '#DFCDB9',
          400: '#CBB39A',
          500: '#AF9378',
          600: '#8F7560',
          700: '#6F594A',
          800: '#4F3E35',
          900: '#362922',
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
