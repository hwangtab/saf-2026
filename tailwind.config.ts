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
          DEFAULT: '#84994F', // Sage Canopy
          soft: '#DDE6B0', // Canopy Mist
          strong: '#6F7C3C', // Woodland Core
          surface: '#F4F7DE', // Canopy Veil
        },
        accent: {
          DEFAULT: '#FCB53B', // Harvest Amber
          soft: '#FFE3B5', // Amber Glow
          strong: '#D9931F', // Ember Honey
        },
        highlight: {
          DEFAULT: '#FFE797', // Morning Grain
          soft: '#FFF4D3', // Golden Haze
          strong: '#FFD86B', // Solar Crest
        },
        ember: {
          DEFAULT: '#B45253', // Terracotta Ember
          soft: '#F0C6C7', // Ember Blush
          strong: '#8F3D3E', // Deep Terracotta
        },
        charcoal: {
          DEFAULT: '#2C2824', // Hearth Ink
          muted: '#4A443E', // Hearth Stone
          soft: '#6A625A', // Hearth Mist
        },
        success: '#6F7C3C',
        warning: '#FCB53B',
        danger: '#B45253',
        light: '#FFFFFF',
        gray: {
          50: '#F7F5ED',
          100: '#EDE6D9',
          200: '#DDD4BE',
          300: '#C4BA9C',
          400: '#AA9F84',
          500: '#8A7F66',
          600: '#6D6350',
          700: '#544C3E',
          800: '#3B352C',
          900: '#251F19',
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
