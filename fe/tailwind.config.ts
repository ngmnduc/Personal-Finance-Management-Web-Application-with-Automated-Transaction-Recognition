import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        border: 'hsl(var(--border))',

        // Legacy colors
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