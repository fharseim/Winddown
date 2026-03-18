/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rise-dark': '#1C1917',
        'rise-coral': '#E85D40',
        'rise-sage': '#2D9E78',
        'rise-bg': '#F5F5F4',
        'rise-bg-warm': '#FAFAF9',
        'rise-muted': '#78716C',
        'rise-muted-light': '#A8A29E',
        'rise-border': '#E7E5E4',
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      letterSpacing: {
        'logo': '0.12em',
      },
    },
  },
  plugins: [],
}
