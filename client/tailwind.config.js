import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0B0D',
        panel: '#14161A',
        line: '#262A31',
        lime: '#C6FF3D',
        muted: '#8A919C',
        peach: '#FFB020',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: { glow: '0 16px 50px rgba(198, 255, 61, .11)' },
    },
  },
  plugins: [forms],
}
