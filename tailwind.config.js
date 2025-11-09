/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'amber-gold': '#D9A441',
        'light-neutral': '#FAFAF8',
        'charcoal': '#212121',
        'mid-grey': '#BDBDBD',
        'deep-green': '#3C6E47',
        'divider': '#E0E0E0',
      },
      fontFamily: {
        'heading': ['Inter', 'Source Sans Pro', 'sans-serif'],
        'body': ['Noto Sans', 'Work Sans', 'sans-serif'],
      },
      spacing: {
        'header': '60px',
        'sidebar': '240px',
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}

