import type { Config } from 'tailwindcss';

// Same brand identity as apps/web — see ADMIN-PANEL-SPEC.md § A01
// ("What Carries Over Unchanged From S01") for why colors/fonts are
// shared but density is not.
const sharedPreset = require('@vytanexa/config');

const config: Config = {
  presets: [sharedPreset],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Admin-specific surface tones, A01 — NOT the brand-tinted
        // shadow-card look from the user app (eye fatigue across
        // dozens of table rows otherwise)
        canvas: '#F4F5F7',
        'admin-border': '#E2E4E9',
      },
      spacing: {
        'row-compact': '40px',
        'row-comfortable': '56px',
        'sidebar-expanded': '240px',
        'sidebar-collapsed': '64px',
      },
      fontSize: {
        'admin-h1': ['24px', { fontWeight: '700' }],
        'admin-h2': ['18px', { fontWeight: '600' }],
        'admin-h3': ['15px', { fontWeight: '600' }],
        'admin-body': ['14px', { fontWeight: '400' }],
        'admin-small': ['12px', { fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};

export default config;
