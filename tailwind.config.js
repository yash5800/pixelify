/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/*.{ts,tsx}', './utils/*.{ts,tsx}', './lib/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: {
          DEFAULT: '#00FF85',
          hover: '#00E599',
          dark: '#00C86A',
          glow: 'rgba(0, 255, 133, 0.25)',
          muted: 'rgba(0, 255, 133, 0.12)',
        },
        bg: '#09090B',
        'bg-secondary': '#111827',
        surface: { 
          DEFAULT: '#121215', 
          card: '#16161A', 
          hover: '#1E1E24',
          glass: 'rgba(18, 18, 22, 0.75)'
        },
        border: 'rgba(255, 255, 255, 0.08)',
        'border-hover': 'rgba(255, 255, 255, 0.16)',
        primary: {
          DEFAULT: '#00FF85',
          hover: '#00E599',
          glow: 'rgba(0, 255, 133, 0.3)'
        },
        accent: { 
          DEFAULT: '#00FF85', 
          hover: '#00E599', 
          glow: 'rgba(0, 255, 133, 0.3)' 
        },
        purple: {
          DEFAULT: '#00FF85',
          glow: 'rgba(0, 255, 133, 0.3)'
        },
        pink: '#00FF85',
        teal: '#00FF85',
        muted: '#A1A1AA',
        'muted-dark': '#71717A',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'aurora-slow': 'aurora 18s ease-in-out infinite alternate',
        'aurora-reverse': 'auroraReverse 22s ease-in-out infinite alternate',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'scanline': 'scanline 3s linear infinite',
        'slide-in-left': 'slideInLeft 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        aurora: {
          '0%': { transform: 'translate(0%, 0%) scale(1) rotate(0deg)' },
          '50%': { transform: 'translate(15%, 10%) scale(1.2) rotate(90deg)' },
          '100%': { transform: 'translate(-10%, -15%) scale(0.9) rotate(180deg)' },
        },
        auroraReverse: {
          '0%': { transform: 'translate(0%, 0%) scale(1.1) rotate(0deg)' },
          '50%': { transform: 'translate(-15%, 12%) scale(0.85) rotate(-90deg)' },
          '100%': { transform: 'translate(10%, -10%) scale(1.25) rotate(-180deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(99, 102, 241, 0.25)' },
          '50%': { boxShadow: '0 0 35px rgba(34, 211, 238, 0.45)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
