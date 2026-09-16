/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        chess: {
          boardLight: '#eeeed2',
          boardDark: '#769656',
          panel: '#1f2427',
          surface: '#262b2f',
          accent: '#81b64c',
          brilliant: '#1ba8c2',
          great: '#5c8bb0',
          best: '#95bb4a',
          good: '#96bc4b',
          inaccuracy: '#f0c15c',
          mistake: '#e58f2a',
          blunder: '#ca3431',
        }
      }
    },
  },
  plugins: [],
}
