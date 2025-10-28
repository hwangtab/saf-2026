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
          DEFAULT: '#5B532C', // Deep Olive
          soft: '#D6CEA2', // Olive Mist
          strong: '#433D1F', // Forest Core
          surface: '#F6F1D8', // Olive Veil
        },
        accent: {
          DEFAULT: '#FFC50F', // Sunbeam Amber
          soft: '#FFE59A', // Amber Glow
          strong: '#E0A500', // Golden Ember
        },
        highlight: {
          DEFAULT: '#FDE7B3', // Wheat Cream
          soft: '#FFF2D4', // Cream Haze
          strong: '#FBD88A', // Wheat Crest
        },
        support: {
          DEFAULT: '#63A361', // Meadow Green
          soft: '#C9E5C7', // Meadow Mist
          strong: '#4E824C', // Grove Core
        },
        charcoal: {
          DEFAULT: '#2F2A1E', // Earth Ink
          muted: '#4F4733', // Earth Stone
          soft: '#6D644A', // Earth Mist
        },
        success: '#63A361',
        warning: '#FFC50F',
        danger: '#5B532C',
        light: '#FFFFFF',
        gray: {
          50: '#FFF2D4',
          100: '#F1E5C2',
          200: '#E4D4AD',
          300: '#D0C196',
          400: '#B8A57A',
          500: '#A3926F',
          600: '#7F7254',
          700: '#6D644A',
          800: '#504834',
          900: '#332E1F',
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
