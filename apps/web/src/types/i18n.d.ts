// Type-safe translation keys (next-intl's documented augmentation point —
// see I18N-IMPLEMENTATION-SPEC.md § 6). Source of truth = `bn`, matching
// `defaultLocale` in `i18n/config.ts`: every namespace is authored in
// Bengali first, so a typo'd key like `t('nav.hmoe')` is now a TypeScript
// error instead of a silent blank string in production.
//
// Update this file's imports whenever a namespace file is added — the
// completeness-check script (`scripts/i18n-check.mjs`) catches missing
// *keys* across locales, but this file is what catches missing/renamed
// keys at the call site.

import type common from '../../messages/bn/common.json';
import type nav from '../../messages/bn/nav.json';
import type onboarding from '../../messages/bn/onboarding.json';
import type home from '../../messages/bn/home.json';
import type doctor from '../../messages/bn/doctor.json';
import type settings from '../../messages/bn/settings.json';
import type offline from '../../messages/bn/offline.json';
import type articles from '../../messages/bn/articles.json';
import type hospital from '../../messages/bn/hospital.json';
import type shared from '../../messages/bn/shared.json';
import type reviews from '../../messages/bn/reviews.json';
import type location from '../../messages/bn/location.json';
import type emergency from '../../messages/bn/emergency.json';
import type blood from '../../messages/bn/blood.json';
import type qa from '../../messages/bn/qa.json';
import type account from '../../messages/bn/account.json';
import type seo from '../../messages/bn/seo.json';
import type validation from '../../messages/bn/validation.json';
import type more from '../../messages/bn/more.json';
import type polls from '../../messages/bn/polls.json';
import type search from '../../messages/bn/search.json';
import type auth from '../../messages/bn/auth.json';

type Messages = {
  common: typeof common;
  nav: typeof nav;
  onboarding: typeof onboarding;
  home: typeof home;
  doctor: typeof doctor;
  settings: typeof settings;
  offline: typeof offline;
  articles: typeof articles;
  hospital: typeof hospital;
  shared: typeof shared;
  reviews: typeof reviews;
  location: typeof location;
  emergency: typeof emergency;
  blood: typeof blood;
  qa: typeof qa;
  account: typeof account;
  seo: typeof seo;
  validation: typeof validation;
  more: typeof more;
  polls: typeof polls;
  search: typeof search;
  auth: typeof auth;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface IntlMessages extends Messages {}
}
