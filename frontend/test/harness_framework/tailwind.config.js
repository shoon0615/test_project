/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#F6F6F3',
        ink: '#191919',
        body: '#444440',
        muted: '#73736C',
        line: '#DFDFD8',
        brand: '#D92D20',
      },
    },
  },
  plugins: [],
};
