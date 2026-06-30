/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#0a0a0f',
          925: '#0d0d14',
          900: '#111118',
          875: '#14141e',
          850: '#17171f',
          800: '#1c1c27',
          750: '#21212e',
          700: '#27273a',
          600: '#3a3a52',
          500: '#52527a',
          400: '#7070a0',
          300: '#9494c0',
          200: '#b8b8d8',
          100: '#dcdcf0',
          50: '#f0f0f8',
        },
        blue: {
          600: '#2563eb',
          500: '#3b82f6',
          400: '#60a5fa',
          300: '#93c5fd',
        },
        emerald: {
          500: '#10b981',
          400: '#34d399',
        },
        amber: {
          500: '#f59e0b',
          400: '#fbbf24',
        },
        red: {
          500: '#ef4444',
          400: '#f87171',
        },
        violet: {
          500: '#8b5cf6',
          400: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
