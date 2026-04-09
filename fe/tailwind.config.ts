import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f1f3d',
          light: '#1a3a5c',
          card: '#162d4a',
        },
        brand: {
          green: '#22c55e',
          red: '#dc2626',
        },
        surface: {
          DEFAULT: '#f8f9fa',
          card: '#ffffff',
        }
      },
    },
  },
  plugins: [],
} satisfies Config