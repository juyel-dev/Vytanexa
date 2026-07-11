/**
 * Vytanexa — Shared Tailwind Preset
 * apps/web and apps/admin both extend this in their own tailwind.config.ts
 * via `presets: [require('@vytanexa/config')]`, then layer app-specific
 * spacing/density on top (see ADMIN-PANEL-SPEC.md § A01 rationale).
 */
const { colors, fontFamily, borderRadius, boxShadow } = require('./design-tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors,
      fontFamily,
      borderRadius,
      boxShadow,
    },
  },
  plugins: [],
};
