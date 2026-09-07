/**
 * App-specific, pre-bound server i18n helpers — mirrors
 * `apps/web/src/lib/i18n.ts`. Admin doesn't currently call
 * `getLocalizedField` anywhere (a few components read `.bn` off a
 * `*_translations` object directly, e.g.
 * `SubscriptionsManager.tsx` — harmless today since admin is Bengali-only,
 * but not going through the shared resolver; noted here rather than
 * silently left undiscoverable, fix tracked as future cleanup, not Phase 1
 * scope). This file exists now so that work has a landing spot instead of
 * reinventing the wrapper later. See I18N-ARCHITECTURE.md § 10.
 */
import type { Json } from '@vytanexa/i18n';
import {
  getFormatter as _getFormatter,
  getLocalizedArray as _getLocalizedArray,
  getLocalizedField as _getLocalizedField,
  getResolvedLocale as _getResolvedLocale,
} from '@vytanexa/i18n/server';
import { localeConfig, type Locale } from '@/i18n/config';

export function getResolvedLocale(): Locale {
  return _getResolvedLocale(localeConfig);
}

export function getLocalizedField(translations: Json | null | undefined): string {
  return _getLocalizedField(translations, localeConfig);
}

export function getLocalizedArray(translations: Json | null | undefined): string[] {
  return _getLocalizedArray(translations, localeConfig);
}

export function getFormatter() {
  return _getFormatter(localeConfig);
}
