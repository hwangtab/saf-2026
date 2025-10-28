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
          DEFAULT: '#25324D', // Deep Indigo
          soft: '#E0E6F1', // Indigo Mist
          strong: '#1B253B', // Midnight Indigo
          surface: '#F3F5FB', // Indigo Veil
        },
        charcoal: {
          DEFAULT: '#1F2330', // Soft Ink
          muted: '#343A4A', // Dusk Slate
          soft: '#4A5063', // Overcast Graphite
        },
        accent: {
          DEFAULT: '#D93F2B', // Ember Orange
          soft: '#FFD0C5', // Ember Tint
          strong: '#B23321', // Ember Core
        },
        support: {
          DEFAULT: '#4CB59F', // Sage Teal
          soft: '#D8F2EA', // Mist Mint
          strong: '#2F806E', // Deep Spruce
        },
        success: '#2F946F',
        warning: '#F4B63B',
        danger: '#D94452',
        light: '#FFFFFF',
        gray: {
          50: '#F5F6F8',
          100: '#E6E8ED',
          200: '#D2D6DF',
          300: '#B6BBC9',
          400: '#949BB0',
          500: '#6F7790',
          600: '#535A70',
          700: '#3D4356',
          800: '#292E3F',
          900: '#1E2330',
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
