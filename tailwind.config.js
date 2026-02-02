/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./**/*.html",
        "./src/**/*.{js,jsx,ts,tsx,vue}",
        "./public/**/*.js"
      ],
      safelist: [
        // Dynamic classes used in elections/voting
        'bg-green-500',
        'bg-blue-500',
        'bg-blue-50',
        'bg-blue-600',
        'bg-red-500',
        'bg-gray-500',
        'bg-purple-500',
        'bg-purple-50',
        'bg-purple-600',
        'bg-purple-700',
        'bg-orange-100',
        'hover:bg-purple-700',
        'hover:bg-blue-700',
        'border-purple-200',
        'border-blue-200',
        'bg-legend-blue',
        'text-blue-600',
        'text-blue-700',
        'text-red-600',
        'text-gray-600',
        'text-green-600',
        'text-purple-600',
        'text-purple-700',
        'text-orange-700',
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
