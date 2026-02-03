import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';
import tailwindcssAnimate from 'tailwindcss-animate';

const brand = {
  50: '#f1f6fa',
  100: '#dfe9f4',
  200: '#c4d6ea',
  300: '#9bb8d8',
  400: '#6e95c4',
  500: '#4c74ad',
  600: '#3b5f94',
  700: '#2f4b76',
  800: '#24385a',
  900: '#172438',
  950: '#0b1525',
};

const accent = {
  50: '#ecfbfa',
  100: '#d2f4f1',
  200: '#a8e8e3',
  300: '#75d7d0',
  400: '#3ec1b7',
  500: '#1aa79c',
  600: '#11857d',
  700: '#0f6a65',
  800: '#0e5450',
  900: '#0c4643',
  950: '#072b29',
};

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      ...colors,
      blue: brand,
      indigo: accent,
      purple: accent,
      teal: accent,
      cyan: accent,
      brand,
      accent,
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
      },
      boxShadow: {
        soft: '0 10px 30px -20px rgba(15, 23, 42, 0.45)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
