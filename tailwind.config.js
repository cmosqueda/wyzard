/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#F4F1EA',          // Warm Newsprint Off-White
          surface: '#FFFFFF',     // Pure Crisp White
          ink: '#141414',         // Off-Black ink
          vermilion: '#FF5E3A',   // Primary Brand Accent
          yellow: '#FFD23F',      // Secondary / Selection Accent
          teal: '#3BCEAC',        // Tertiary / Interactive Accent
          violet: '#9B5DE5',      // Breakpoint Override Highlight
          gray: {
            50: '#F9F8F6',
            100: '#EFECE6',
            200: '#DFDAD0',
            300: '#C7C1B5',
            400: '#948D80',
            500: '#6A6459',
          }
        }
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'Syne', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px #141414',
        'neo': '4px 4px 0px #141414',
        'neo-lg': '6px 6px 0px #141414',
        'neo-active': '1px 1px 0px #141414',
        'neo-yellow': '4px 4px 0px #FFD23F',
        'neo-vermilion': '4px 4px 0px #FF5E3A',
      },
      borderWidth: {
        'neo': '2px',
        'neo-thick': '3px',
      }
    },
  },
  plugins: [],
};
