import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

const config: Config = {
  // Enable class-based dark mode (controlled by next-themes)
  darkMode: 'class',

  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
    './src/styles/**/*.css',
  ],

  theme: {
    extend: {
      // ── Colors — map CSS token names to Tailwind utilities ──────
      colors: {
        // Primary brand (indigo-violet)
        primary: {
          50:  'hsl(239, 100%, 97%)',
          100: 'hsl(236, 100%, 94%)',
          200: 'hsl(238,  95%, 88%)',
          300: 'hsl(237,  87%, 79%)',
          400: 'hsl(239,  82%, 71%)',
          500: 'hsl(239,  84%, 67%)',
          600: 'hsl(243,  75%, 59%)',
          700: 'hsl(245,  58%, 51%)',
          800: 'hsl(244,  55%, 41%)',
          900: 'hsl(244,  55%, 35%)',
          950: 'hsl(244,  60%, 20%)',
        },
        // Accent — emerald (success, ready, pass)
        accent: {
          100: 'hsl(152, 76%, 92%)',
          400: 'hsl(158, 64%, 52%)',
          500: 'hsl(160, 84%, 39%)',
          600: 'hsl(161, 94%, 30%)',
        },
        // Signal — Neon/Cyan (AI active)
        signal: {
          100: 'var(--color-signal-100)',
          300: 'var(--color-signal-300)',
          400: 'var(--color-signal-400)',
          500: 'var(--color-signal-500)',
          600: 'var(--color-signal-600)',
        },
        // Surfaces — semantic backgrounds (CSS vars at runtime)
        surface: {
          0:  'var(--surface-0)',
          1:  'var(--surface-1)',
          2:  'var(--surface-2)',
          3:  'var(--surface-3)',
        },
        // Keep existing brand for backwards compatibility
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5bafd',
          400: '#8192fa',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },

      // ── Fonts ─────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      // ── Border Radius ──────────────────────────────────────────
      borderRadius: {
        sm:  '0.375rem',   /* 6px  */
        md:  '0.625rem',   /* 10px */
        lg:  '1rem',       /* 16px */
        xl:  '1.5rem',     /* 24px */
        '2xl': '2rem',     /* 32px */
        '3xl': '2.5rem',   /* 40px */
      },

      // ── Box Shadows (including glow effects) ──────────────────
      boxShadow: {
        'glow-primary': 'var(--shadow-glow-primary)',
        'glow-accent':  'var(--shadow-glow-accent)',
        'glow-error':   'var(--shadow-glow-error)',
        'glow-warning': 'var(--shadow-glow-warning)',
        'glow-signal':  'var(--shadow-glow-signal)',
        'inner-sm':     'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
        'inner-md':     'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
      },

      backgroundImage: {
        'noise': 'var(--noise-pattern)',
      },

      // ── Custom Animations ─────────────────────────────────────
      keyframes: {
        // Alex speaking — slow heartbeat glow
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1', boxShadow: '0 0 0 0 rgba(0, 255, 255, 0)' },
          '50%': { transform: 'scale(1.02)', opacity: '0.95', boxShadow: 'var(--shadow-glow-signal)' },
        },
        // Status badge pulse
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        // Waveform bar dance
        'wave-1': {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'wave-2': {
          '0%, 100%': { transform: 'scaleY(0.8)' },
          '25%': { transform: 'scaleY(0.3)' },
          '75%': { transform: 'scaleY(1)' },
        },
        'wave-3': {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '60%': { transform: 'scaleY(1)' },
        },
        // Slide in from bottom
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Fade in
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Shimmer for skeletons
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Thinking dots
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-6px)' },
        },
        // Score ring fill
        'ring-fill': {
          '0%': { strokeDashoffset: '251' },
          '100%': { strokeDashoffset: 'var(--ring-offset)' },
        },
      },

      animation: {
        breathe:      'breathe 4s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'wave-1':     'wave-1 1.2s ease-in-out infinite',
        'wave-2':     'wave-2 1.4s ease-in-out infinite',
        'wave-3':     'wave-3 1.1s ease-in-out infinite',
        'slide-up':   'slide-up 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in':    'fade-in 200ms ease-out forwards',
        shimmer:      'shimmer 2s linear infinite',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        'ring-fill':  'ring-fill 1s ease-out forwards',
      },

      // ── Transition Timing ─────────────────────────────────────
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'snappy': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // ── Custom Background Sizes ───────────────────────────────
      backgroundSize: {
        '200%': '200%',
      },

      // ── Height helpers for layout ─────────────────────────────
      height: {
        'topbar': '3.5rem', /* 56px */
      },
      minHeight: {
        'topbar': '3.5rem',
      },
    },
  },

  plugins: [forms, typography],
};

export default config;
