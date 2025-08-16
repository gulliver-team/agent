/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      boxShadow: { soft: '0 10px 25px rgba(0,0,0,0.08)' },
      borderRadius: { '2xl': '1rem' },
    },
  },
  plugins: [],
}


