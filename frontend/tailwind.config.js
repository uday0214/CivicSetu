/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          900: '#1E3A5F',
          800: '#2A4B75',
          100: '#E9EEF5',
          50: '#F4F7FA',
        },
        action: {
          saffron: '#EA580C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'Noto Sans Telugu', 'Noto Sans Tamil', 'Noto Sans Kannada', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
