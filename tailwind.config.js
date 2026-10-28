/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        blue: 'var(--blue)',
        pink: 'var(--pink)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { '4xl': '28px' },
      transitionTimingFunction: { calm: 'cubic-bezier(.4,0,.2,1)' },
    },
  },
  plugins: [],
}
