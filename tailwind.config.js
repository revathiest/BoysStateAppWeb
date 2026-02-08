/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./**/*.html",
        "./src/**/*.{js,jsx,ts,tsx,vue}",
        "./public/**/*.js"
      ],
      safelist: [
        // Dynamic classes used in elections/voting
        'w-0',
        'bg-green-500',
        'bg-green-600',
        'hover:bg-green-700',
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
        'bg-orange-500',
        'bg-orange-600',
        'hover:bg-purple-700',
        'hover:bg-blue-700',
        'hover:bg-orange-600',
        'hover:bg-red-600',
        'border-purple-200',
        'border-blue-200',
        'bg-legend-blue',
        'text-blue-600',
        'text-blue-700',
        'text-blue-800',
        'text-red-600',
        'text-gray-600',
        'text-green-600',
        'text-purple-600',
        'text-purple-700',
        'text-orange-700',
        // Yellow classes for tie resolution UI
        'bg-yellow-50',
        'bg-yellow-600',
        'hover:bg-yellow-700',
        'hover:bg-yellow-100',
        'border-yellow-200',
        'text-yellow-600',
        'text-yellow-700',
        'text-yellow-800',
        // Amber classes for tie indicator on election cards
        'text-amber-700',
        // Badge classes for party primary/advancement models
        'bg-blue-100',
        'bg-green-100',
        'text-green-700',
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
