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
          DEFAULT: '#6FA4AF', // Tidal Teal
          soft: '#D2E3E6', // Teal Mist
          strong: '#4E8893', // Deep Teal
          surface: '#EDF4F5', // Teal Veil
        },
        accent: {
          DEFAULT: '#D97D55', // Clay Ember
          soft: '#F2CDBC', // Clay Glow
          strong: '#B8663F', // Clay Core
        },
        highlight: {
          DEFAULT: '#B8C4A9', // Sage Meadow
          soft: '#E2E7D9', // Sage Mist
          strong: '#9FAA8B', // Sage Core
        },
        canvas: {
          DEFAULT: '#F4E9D7', // Sand Shell
          soft: '#FBF4E8', // Sand Light
          strong: '#E3D1B4', // Sand Core
        },
        charcoal: {
          DEFAULT: '#2F2926', // Hearth Ink
          muted: '#4A433E', // Hearth Stone
          soft: '#6C635C', // Hearth Mist
        },
        success: '#6FA4AF',
        warning: '#D97D55',
        danger: '#B85A48',
        light: '#FFFFFF',
        gray: {
          50: '#FBF8F1',
          100: '#F2E9DB',
          200: '#E4D7C2',
          300: '#D2C3AA',
          400: '#B8A890',
          500: '#9A8C78',
          600: '#7C7261',
          700: '#61584C',
          800: '#473F37',
          900: '#332C26',
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
