/**
 * @vytanexa/i18n — shared types.
 *
 * See I18N-ARCHITECTURE.md for the full design rationale. This package
 * deliberately has no dependency on `@vytanexa/database` or any app-specific
 * type — it doesn't know what a "doctor" or a "translations column" is, only
 * how to resolve locale-keyed values generically. Each app narrows `Locale`
 * to its own union (e.g. `'bn' | 'en' | 'hi'`) via its own `LocaleConfig`.
 */

export type Locale = string;

/**
 * Loosely-typed JSON value — mirrors what a Supabase JSONB column decodes
 * to, without importing `@vytanexa/database`'s `Json` type (that would
 * couple a generic i18n package to one app's database layer for no
 * benefit — the shape is standard JSON, not Vytanexa-specific).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Shape of a `*_translations` JSONB column: `{ bn: "...", en: "...", hi: "..." }`. */
export type LocalizedText = Partial<Record<string, string>>;

export interface LocaleConfig<L extends string = string> {
  /** Every locale this app supports. */
  readonly locales: readonly L[];
  /** Used whenever the resolved locale is missing/invalid, and as the first
   *  fallback step in the localized-field resolution chain. */
  readonly defaultLocale: L;
  /** BCP-47 tag per locale, fed to the native `Intl.*` constructors
   *  (e.g. `{ bn: 'bn-IN', en: 'en-IN', hi: 'hi-IN' }`). */
  readonly intlLocale: Record<L, string>;
  /** ISO 4217 currency code. Constant across locales on purpose — only the
   *  *label language* changes with locale, never the transaction currency. */
  readonly currency: string;
}

/**
 * Merged messages object for one locale, one key per namespace file
 * (e.g. `{ common: {...}, nav: {...}, doctor: {...} }`). Opaque to
 * application code — only next-intl (inside this package) reads its shape.
 */
export type Messages = Record<string, unknown>;
