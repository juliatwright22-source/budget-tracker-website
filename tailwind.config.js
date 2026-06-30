/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white:  '#F9F9F9',
        blue:   '#004E72',
        navy:   '#092634',
        orange: '#FF6E42',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['DM Sans', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
