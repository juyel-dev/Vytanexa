import type { Config } from 'tailwindcss';

// Shared brand tokens (colors/fonts/radius/shadow) — see
// VYTANEXA-BLUEPRINT.md § S01 and packages/config/design-tokens.js
const sharedPreset = require('@vytanexa/config');

const config: Config = {
  presets: [sharedPreset],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // User-app-specific layout constants, S01 § 9
      spacing: {
        'topbar': '56px',
        'navbar': '64px',
        'fab-size': '56px',
      },
      zIndex: {
        dropdown: '100',
        sticky: '200',
        navbar: '300',
        fab: '400',
        sheet: '500',
        modal: '600',
        toast: '700',
        overlay: '800',
        splash: '900',
      },
    },
  },
  plugins: [],
};

export default config;
