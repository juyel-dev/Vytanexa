'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
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

/**
 * Client-side equivalent of `getLocalizedField` — matches next-intl's own
 * `useTranslations()` → `t(key)` shape on purpose: this is a hook that
 * returns a plain function, NOT a hook that resolves one value directly.
 *
 * That distinction matters for correctness, not just style: this app
 * renders lists constantly (doctor cards, article cards, category grids),
 * and a hook cannot be called once per array item inside `.map()` —
 * that breaks React's Rules of Hooks (hook call order must be identical
 * every render, which a variable-length list can't guarantee). Calling
 * the hook once — `const localize = useLocalizedField();` — and then
 * calling the plain function it returns per item —
 * `items.map((i) => localize(i.name_translations))` — is the same
 * pattern every consumer of this codebase already uses successfully for
 * static messages, and is safe anywhere: top level, inside `.map()`,
 * inside conditionals.
 */
export function useLocalizedField(): (translations: Json | null | undefined) => string {
  const { locale, config } = useLocaleCtx();
  return useCallback(
    (translations: Json | null | undefined) => resolveLocalizedField(translations, locale, config),
    [locale, config],
  );
}

/** Client-side equivalent of `getLocalizedArray` — same "call the hook
 *  once, call the returned function many times" shape as
 *  `useLocalizedField` above, for the same Rules-of-Hooks reason. */
export function useLocalizedArray(): (translations: Json | null | undefined) => string[] {
  const { locale, config } = useLocaleCtx();
  return useCallback(
    (translations: Json | null | undefined) => resolveLocalizedArray(translations, locale, config),
    [locale, config],
  );
}

/** Client-side equivalent of `getFormatter`. */
export function useFormatter(): Formatter {
  const { locale, config } = useLocaleCtx();
  return useMemo(() => createFormatter(locale, config), [locale, config]);
}
