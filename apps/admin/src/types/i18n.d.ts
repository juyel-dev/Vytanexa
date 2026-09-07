// See apps/web/src/types/i18n.d.ts for the full rationale — identical
// pattern, admin's smaller namespace set.

import type app from '../../messages/bn/app.json';
import type nav from '../../messages/bn/nav.json';
import type auth from '../../messages/bn/auth.json';
import type common from '../../messages/bn/common.json';
import type toast from '../../messages/bn/toast.json';

type Messages = {
  app: typeof app;
  nav: typeof nav;
  auth: typeof auth;
  common: typeof common;
  toast: typeof toast;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface IntlMessages extends Messages {}
}
