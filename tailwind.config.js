/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./**/*.html",
        "./src/**/*.{js,jsx,ts,tsx,vue}",
        "./public/**/*.js"
      ],
      theme: {
        extend: {
          colors: {
            'legend-blue': '#1B3D6D',
            'legend-gold': '#FFD700'
          }
        }
      },
    plugins: [],
  }
