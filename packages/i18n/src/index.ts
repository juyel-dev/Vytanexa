/**
 * Root entry point — types only. Runtime code is deliberately split across
 * two separate entry points, `@vytanexa/i18n/server` and
 * `@vytanexa/i18n/client`, so a Client Component can never accidentally
 * pull in `server-only`-guarded code (or vice versa) just by importing the
 * package root. See I18N-ARCHITECTURE.md § 2.
 */
export type { Json, Locale, LocaleConfig, LocalizedText, Messages } from './types';
