/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bloods: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#8b0000',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        gold: {
          50: '#fdf9ec',
          100: '#f9efcb',
          200: '#f2dd93',
          300: '#e8c96a',
          400: '#ddb543',
          500: '#c9a227',
          600: '#a97f1e',
          700: '#875d1b',
          800: '#6f4b1d',
          900: '#5f3e1d',
        },
        dark: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d4d8e2',
          300: '#aab2c5',
          400: '#7c87a3',
          500: '#5c6788',
          600: '#47506b',
          700: '#394056',
          800: '#1a1a2e',
          850: '#151523',
          900: '#0f0f1a',
          950: '#0a0a12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
