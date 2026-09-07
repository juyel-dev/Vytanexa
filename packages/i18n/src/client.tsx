'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { NextIntlClientProvider, useTranslations, type AbstractIntlMessages } from 'next-intl';
import { createFormatter, type Formatter } from './format';
import { resolveLocalizedArray, resolveLocalizedField } from './resolve-field';
import type { Json, LocaleConfig, Messages } from './types';

/**
 * `packages/i18n` public client API — mirrors `server.ts` (see there for
 * the full rationale). Client Components can't read `cookies()`, so the
 * current locale + config are threaded through React Context by
 * `<I18nProvider>` (mounted once, in each app's root layout) instead.
 */

/** Thin, intentional passthrough — see `server.ts`'s `getT` for why. */
export const useT = useTranslations;

interface LocaleCtxValue<L extends string = string> {
  locale: L;
  config: LocaleConfig<L>;
}
const LocaleCtx = createContext<LocaleCtxValue | null>(null);

/**
 * Wraps `NextIntlClientProvider` — this is still the *only* place
 * `NextIntlClientProvider` is used anywhere in the monorepo. Mount once per
 * app, at the root layout, with the same `locale`/`messages` that were
 * already resolved server-side for this request.
 */
export function I18nProvider<L extends string>({
  locale,
  config,
  messages,
  children,
}: {
  locale: L;
  config: LocaleConfig<L>;
  messages: Messages;
  children: ReactNode;
}) {
  const ctxValue = useMemo(() => ({ locale, config }), [locale, config]);

  return (
    <LocaleCtx.Provider value={ctxValue}>
      {/* Messages' values are `unknown` (this package doesn't know or care
          what shape a namespace file is) where next-intl's own type wants
          a recursive `string | AbstractIntlMessages` — structurally
          compatible at runtime (they're plain JSON), not something
          `unknown` can express to TS without this one contained cast. */}
      <NextIntlClientProvider locale={locale} messages={messages as AbstractIntlMessages}>
        {children}
      </NextIntlClientProvider>
    </LocaleCtx.Provider>
  );
}

function useLocaleCtx(): LocaleCtxValue {
  const ctx = useContext(LocaleCtx);
  if (!ctx) {
    throw new Error(
      'useResolvedLocale / useLocalizedField / useFormatter must be used within <I18nProvider>. ' +
        'Is the root layout still wrapping children with it?',
    );
  }
  return ctx;
}

export function useResolvedLocale<L extends string = string>(): L {
  return useLocaleCtx().locale as L;
}

/** Client-side equivalent of `getLocalizedField` — same fallback chain,
 *  locale read from `<I18nProvider>` context instead of a cookie. */
export function useLocalizedField(translations: Json | null | undefined): string {
  const { locale, config } = useLocaleCtx();
  return resolveLocalizedField(translations, locale, config);
}

/** Client-side equivalent of `getLocalizedArray`. */
export function useLocalizedArray(translations: Json | null | undefined): string[] {
  const { locale, config } = useLocaleCtx();
  return resolveLocalizedArray(translations, locale, config);
}

/** Client-side equivalent of `getFormatter`. */
export function useFormatter(): Formatter {
  const { locale, config } = useLocaleCtx();
  return useMemo(() => createFormatter(locale, config), [locale, config]);
}
