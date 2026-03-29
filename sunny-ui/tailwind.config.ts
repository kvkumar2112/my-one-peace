import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1D9E75',
        safe: '#0F6E56',
        'warning-dark': '#BA7517',
        warning: '#EF9F27',
        'danger-dark': '#993C1D',
        danger: '#E24B4A',
        'nav-active-bg': '#E1F5EE',
        'nav-active-text': '#0F6E56',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs: ['12px', '18px'],
        sm: ['13px', '20px'],
        'sm+': ['13.5px', '20px'],
        base: ['14px', '22px'],
        lg: ['16px', '24px'],
        xl: ['20px', '28px'],
        '2xl': ['22px', '30px'],
      },
      borderWidth: {
        '0.5': '0.5px',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      spacing: {
        '18': '72px',
        sidebar: '220px',
      },
    },
  },
  plugins: [],
} satisfies Config
