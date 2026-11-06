import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16110c', 2: '#2e261d', 3: '#574b3c' },
        paper: { DEFAULT: '#f5f0e4', 2: '#ece4d2', 3: '#e3d9c2' },
        press: { DEFAULT: '#b8321f', 2: '#8f2415' },
        gold: '#9a7b33',
        bg: { DEFAULT: '#15110d', 2: '#1e1810', 3: '#272015' },
        edge: { DEFAULT: '#cdc1a6', 2: '#dbd0b6' },
      },
      fontFamily: {
        disp: ['var(--font-disp)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
