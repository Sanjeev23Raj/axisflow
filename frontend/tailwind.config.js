/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Redirection of primary to spidey red!
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        spidey: {
          red: '#d90429',
          blue: '#00509d',
          dark: '#0f172a',
          yellow: '#ffd166',
          accent: '#ffb703',
          border: '#000000',
        }
      },
      fontFamily: {
        sans: ['"Comic Neue"', 'Inter', 'system-ui', 'sans-serif'],
        comic: ['"Comic Neue"', 'sans-serif'],
        bangers: ['Bangers', 'cursive'],
      },
      boxShadow: {
        'comic': '4px 4px 0px 0px #000000',
        'comic-lg': '8px 8px 0px 0px #000000',
        'comic-sm': '2px 2px 0px 0px #000000',
        'comic-yellow': '4px 4px 0px 0px #ffd166',
      }
    },
  },
  plugins: [],
}
