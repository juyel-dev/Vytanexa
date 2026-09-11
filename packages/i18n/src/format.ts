import type { LocaleConfig } from './types';

/**
 * Replaces the old hand-written `toBengaliDigits()` / `formatRelativeTimeBn()`
 * (apps/web/src/lib/i18n.ts) with locale-generic formatting on top of native
 * `Intl`. `Intl.NumberFormat('bn-IN')` already produces native Bengali digits
 * (CLDR's default numbering system for `bn` is `beng`) and correct Indian
 * digit grouping (lakh/crore) — something the old helper never did and
 * could not have for `en`/`hi`. See I18N-ARCHITECTURE.md § 5/§ 7.
 */
export interface Formatter {
  number(value: number, options?: Intl.NumberFormatOptions): string;
  currency(value: number, options?: Intl.NumberFormatOptions): string;
  /** Locale-correct range formatting (e.g. "₹500–800", not "₹500-₹800")
   *  via `Intl.NumberFormat.formatRange`. */
  currencyRange(min: number, max: number, options?: Intl.NumberFormatOptions): string;
  dateTime(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  /** Cascades second → minute → hour → day → month → year, same bucket
   *  boundaries the original `formatRelativeTimeBn` used. */
  relativeTime(value: Date | number): string;
}

export function createFormatter<L extends string>(locale: L, config: LocaleConfig<L>): Formatter {
  const intlLocale = config.intlLocale[locale] ?? config.intlLocale[config.defaultLocale];

  return {
    number: (value, options) => new Intl.NumberFormat(intlLocale, options).format(value),

    currency: (value, options) =>
      new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency: config.currency,
        maximumFractionDigits: 0,
        ...options,
      }).format(value),

    currencyRange: (min, max, options) =>
      new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency: config.currency,
        maximumFractionDigits: 0,
        ...options,
      }).formatRange(min, max),

    dateTime: (value, options) => new Intl.DateTimeFormat(intlLocale, options).format(value),

    relativeTime: (value) => {
      const then = typeof value === 'number' ? value : value.getTime();
      const diffSec = Math.round((then - Date.now()) / 1000); // negative = past
      const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' });

      if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
      const diffMin = Math.round(diffSec / 60);
      if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
      const diffHour = Math.round(diffMin / 60);
      if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
      const diffDay = Math.round(diffHour / 24);
      if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
      const diffMonth = Math.round(diffDay / 30);
      if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month');
      const diffYear = Math.round(diffMonth / 12);
      return rtf.format(diffYear, 'year');
    },
  };
}
