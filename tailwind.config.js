/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Vazirmatn Variable"', 'Vazirmatn', 'Tahoma', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#608bfa',
          500: '#3b66f5',
          600: '#2549ea',
          700: '#1d38d7',
          800: '#1e30ae',
          900: '#1e2f89',
        },
      },
      fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] },
    },
  },
  plugins: [],
}
