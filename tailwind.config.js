/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#FDF6EC',
          surface: '#FDF0DC',
          surfaceAlt: '#FFFAF4',
        },
        accent: {
          primary: '#D47C2A',
          bright: '#F0A830',
          deep: '#8B4A1A',
        },
        meru: '#8B3A1A',
        text: {
          primary: '#3D2010',
          secondary: '#A08060',
          hint: '#C8A878',
        },
        border: {
          DEFAULT: '#E8D5B0',
        },
        celebration: '#2C1205',
      }
    },
  },
  plugins: [],
}
