/**
 * Vytanexa — Shared Design Tokens
 * Source of truth: VYTANEXA-BLUEPRINT.md § S01 (Brand System)
 * Shared between apps/web (user app) and apps/admin (admin panel) —
 * both use the SAME brand identity; density/spacing differs per-app
 * (see ADMIN-PANEL-SPEC.md § A01 for why admin diverges on spacing).
 *
 * These values are also written into `app_settings.theme_colors`
 * (DATABASE-SCHEMA.md § 1.5) as the DEFAULT — admin's Theme Editor
 * (ADMIN-PANEL-SPEC.md § A07) can override the brand/life/emergency/
 * accent colors at runtime without a redeploy. This file is the
 * fallback + the values seeded into that JSONB column initially.
 */

const colors = {
  brand: {
    50: '#EEF4FF',
    500: '#2D6FD9',
    600: '#1756C8',
    700: '#1245A8',
  },
  life: {
    50: '#E8FBF3',
    600: '#0CAF74',
    700: '#099460',
  },
  accent: {
    50: '#FFFBEB',
    500: '#F59E0B',
  },
  emergency: {
    50: '#FEF2F2',
    500: '#EF4444',
    600: '#DC2626',
  },
  tier: {
    free: '#94A3B8',
    basic: '#0CAF74',
    pro: '#1756C8',
    premium: '#7C3AED',
  },
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#0A0F1E',
  },
};

const fontFamily = {
  'bengali-display': ['var(--font-bengali-display)', 'Noto Sans Bengali', 'sans-serif'],
  'bengali-body': ['var(--font-bengali-body)', 'Hind Siliguri', 'sans-serif'],
  sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'Courier New', 'monospace'],
};

const borderRadius = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
};

const boxShadow = {
  card: '0 2px 12px rgba(23,86,200,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  brand: '0 4px 16px rgba(23,86,200,0.20)',
};

const motion = {
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  easeSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

module.exports = { colors, fontFamily, borderRadius, boxShadow, motion };
