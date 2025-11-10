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
        'light-neutral': '#121212',
        'charcoal': '#E5E5E5',
        'mid-grey': '#9CA3AF',
        'deep-green': '#3C6E47',
        'divider': '#2A2A2A',
        'dark-card': '#1E1E1E',
        'dark-surface': '#181818',
      },
      fontFamily: {
        'heading': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        'body': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
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

