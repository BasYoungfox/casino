import type { Config } from 'tailwindcss';

// Palette inspired by clean Solana crypto-casino aesthetics (e.g. solpump.io):
// near-black ink backgrounds, subtle borders, vivid emerald accent.
const ink = {
  950: '#08090b',
  DEFAULT: '#0b0c0f',
  800: '#101218',
  700: '#16181f',
  600: '#1c1f28',
  500: '#262a35',
};
const brand = {
  DEFAULT: '#00e599',
  light: '#3df0a8',
  dark: '#00b377',
};

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // New tokens
        ink,
        brand,
        danger: '#ff4d5e',
        // Legacy aliases (remapped so existing pages adopt the new look)
        felt: { DEFAULT: ink[700], dark: ink.DEFAULT },
        gold: { DEFAULT: brand.DEFAULT, light: brand.light },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(0, 229, 153, 0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};

export default config;
