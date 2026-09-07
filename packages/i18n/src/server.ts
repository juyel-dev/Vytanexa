import 'server-only';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { createFormatter, type Formatter } from './format';
import { resolveLocale, resolveLocalizedArray, resolveLocalizedField } from './resolve-field';
import type { Json, LocaleConfig } from './types';

/**
 * `packages/i18n` public server API. Application code imports from
 * `@vytanexa/i18n/server` and never from `next-intl` directly — see
 * I18N-ARCHITECTURE.md § 2 for why. `next-intl` itself is imported only in
 * this file, `client.tsx`, and each app's own `i18n/request.ts` (which was
 * already, correctly, the one place message-loading happens — this
 * redesign doesn't move that responsibility, see IMPLEMENTATION-SPEC § 1).
 */

/**
 * Static UI-chrome strings, namespace-scoped. A thin, intentional
 * passthrough of next-intl's own `getTranslations` — Tier A (static
 * messages) already worked correctly wherever it was used; the facade
 * exists so components depend on `@vytanexa/i18n`, not on which library
 * implements it, not because this needed new logic.
 */
export const getT = getTranslations;

/**
 * Resolves the current request's locale from the `locale` cookie
 * (identical precedence to `i18n/request.ts`: cookie → `defaultLocale`).
 * Synchronous — `cookies()` is sync in Next 14, so this never requires
 * `await`, which is what keeps `getLocalizedField` below a drop-in,
 * same-signature replacement at every existing Server-Component call site.
 */
export function getResolvedLocale<L extends string>(config: LocaleConfig<L>): L {
  return resolveLocale(cookies().get('locale')?.value, config);
}

/**
 * Resolves a `*_translations` JSONB field for the current request's locale.
 * THIS is the fix for the original bug (see I18N-ARCHITECTURE.md § "why
 * this doc exists"): the exact same one-argument-plus-config call shape as
 * before, but it now actually reads the request's locale instead of
 * silently defaulting to `'bn'` every time.
 */
export function getLocalizedField(translations: Json | null | undefined, config: LocaleConfig): string {
  return resolveLocalizedField(translations, getResolvedLocale(config), config);
}

/** Array variant of `getLocalizedField` — see `resolve-field.ts`. */
export function getLocalizedArray(translations: Json | null | undefined, config: LocaleConfig): string[] {
  return resolveLocalizedArray(translations, getResolvedLocale(config), config);
}

/** Number/date/currency/relative-time formatting for the current request's locale. */
export function getFormatter(config: LocaleConfig): Formatter {
  return createFormatter(getResolvedLocale(config), config);
}
