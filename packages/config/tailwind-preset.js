/**
 * Vytanexa — Shared Tailwind Preset
 * apps/web and apps/admin both extend this in their own tailwind.config.ts
 * via `presets: [require('@vytanexa/config')]`, then layer app-specific
 * spacing/density on top (see ADMIN-PANEL-SPEC.md § A01 rationale).
 */
const { colors, fontFamily, borderRadius, boxShadow } = require('./design-tokens');

/**
 * S01 § 7 "Named Animations (Keyframes)" — defined once here so every
 * app (web, admin) gets the same motion vocabulary via Tailwind
 * utility classes (`animate-slide-up`, etc.) instead of ad-hoc
 * arbitrary values scattered per component.
 */
const keyframes = {
  fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
  slideUp: {
    from: { transform: 'translateY(20px)', opacity: '0' },
    to: { transform: 'translateY(0)', opacity: '1' },
  },
  slideInRight: {
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0)' },
  },
  scaleIn: {
    from: { transform: 'scale(0.95)', opacity: '0' },
    to: { transform: 'scale(1)', opacity: '1' },
  },
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%': { transform: 'translateX(-4px)' },
    '75%': { transform: 'translateX(4px)' },
  },
  progress: {
    from: { transform: 'scaleX(0)' },
    to: { transform: 'scaleX(1)' },
  },
};

const animation = {
  'fade-in': 'fadeIn 250ms ease-out',
  'slide-up': 'slideUp 280ms cubic-bezier(0.16, 1, 0.3, 1)',
  'slide-in-right': 'slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1)',
  'scale-in': 'scaleIn 200ms ease-out',
  shake: 'shake 300ms ease-in-out',
  progress: 'progress 1800ms linear forwards',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors,
      fontFamily,
      borderRadius,
      boxShadow,
      keyframes,
      animation,
    },
  },
  plugins: [],
};
