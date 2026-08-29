/**
 * Sidebar / nav config — ADMIN-PANEL-SPEC.md § A02 "Sidebar Navigation
 * Map" + "Route Map" + "Role & Permission Matrix".
 *
 * Single source of truth: the same `NAV_GROUPS` array drives the rendered
 * sidebar AND the route→role map checked by `requireRole()` in
 * `auth-verify.ts`. Adding a new screen means adding ONE entry here —
 * both the nav item and its role gate come from it, so they can never
 * drift apart.
 *
 * 6 groups (not a flat list) match how the schema is organized
 * (Parts 1-5): "গড মোড কন্ট্রোল" is its own distinct group because these
 * are the highest-leverage, highest-blast-radius screens — visually
 * separated to make the operator pause and be deliberate.
 */
import type { AppRole } from '@/lib/supabase/auth-verify';

export type NavItem = {
  href: string;
  labelKey: string; // i18n key; resolved at render time
  icon: string;
  badgeCount?: number; // live count from DB, e.g. pending moderation
  roles?: AppRole[]; // undefined = visible to all roles
};

export type NavGroup = {
  labelKey: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.dashboard',
    items: [
      { href: '/', labelKey: 'nav.dashboardHome', icon: '📊' },
    ],
  },
  {
    labelKey: 'nav.entities',
    items: [
      { href: '/doctors', labelKey: 'nav.doctors', icon: '👨‍⚕️' },
      { href: '/hospitals', labelKey: 'nav.hospitals', icon: '🏥' },
      { href: '/locations', labelKey: 'nav.locations', icon: '📍' },
      { href: '/categories', labelKey: 'nav.categories', icon: '🏷️' },
      { href: '/blood-donors', labelKey: 'nav.bloodDonors', icon: '🩸' },
      { href: '/ambulance', labelKey: 'nav.ambulance', icon: '🚑' },
    ],
  },
  {
    labelKey: 'nav.moderation',
    items: [
      { href: '/moderation/reviews', labelKey: 'nav.reviews', icon: '⭐', badgeCount: 0 },
      { href: '/moderation/qa', labelKey: 'nav.qa', icon: '💬', badgeCount: 0 },
      { href: '/moderation/reports', labelKey: 'nav.reports', icon: '🚩', badgeCount: 0 },
    ],
  },
  {
    labelKey: 'nav.content',
    items: [
      { href: '/articles', labelKey: 'nav.articles', icon: '📰' },
      { href: '/polls', labelKey: 'nav.polls', icon: '📊' },
      { href: '/pages', labelKey: 'nav.pages', icon: '📄' },
      { href: '/notifications', labelKey: 'nav.notifications', icon: '🔔' },
    ],
  },
  {
    labelKey: 'nav.business',
    items: [
      { href: '/leads', labelKey: 'nav.leads', icon: '📋' },
      { href: '/subscriptions', labelKey: 'nav.subscriptions', icon: '💳' },
      { href: '/ads', labelKey: 'nav.ads', icon: '📢' },
    ],
  },
  {
    labelKey: 'nav.godMode',
    items: [
      { href: '/god-mode/homepage', labelKey: 'nav.homepage', icon: '🏠', roles: ['super_admin'] },
      { href: '/god-mode/theme', labelKey: 'nav.theme', icon: '🎨', roles: ['super_admin'] },
      { href: '/god-mode/footer', labelKey: 'nav.footer', icon: '📱', roles: ['super_admin'] },
      { href: '/god-mode/flags', labelKey: 'nav.flags', icon: '🚩', roles: ['super_admin'] },
      { href: '/god-mode/menu', labelKey: 'nav.menu', icon: '☰', roles: ['super_admin'] },
    ],
  },
  {
    labelKey: 'nav.system',
    items: [
      { href: '/analytics', labelKey: 'nav.analytics', icon: '📈' },
      { href: '/admins', labelKey: 'nav.admins', icon: '👤', roles: ['super_admin'] },
      { href: '/audit-log', labelKey: 'nav.auditLog', icon: '📜' },
      { href: '/settings', labelKey: 'nav.settings', icon: '⚙️', roles: ['super_admin'] },
    ],
  },
];

/**
 * Role & Permission Matrix — A02. Defaults per spec:
 *   super_admin: everything
 *   admin: CRUD + verify + moderate + publish + leads + ads + analytics
 *   moderator: moderate only
 *   editor: content CRUD, not publish (editor can DRAFT, not publish —
 *       a review step, matches the RichTextEditor safety philosophy)
 * `permissions` JSONB lets super_admin grant a one-off override
 * (e.g. "this specific admin CAN also touch god-mode") without
 * inventing a new role.
 */
export const ROLE_DEFAULTS: Record<AppRole, { canVerify: boolean; canModerate: boolean; canPublish: boolean; canGodMode: boolean; canManageAdmins: boolean; canPricing: boolean }> = {
  super_admin: { canVerify: true, canModerate: true, canPublish: true, canGodMode: true, canManageAdmins: true, canPricing: true },
  admin:       { canVerify: true, canModerate: true, canPublish: true, canGodMode: false, canManageAdmins: false, canPricing: false },
  moderator:   { canVerify: false, canModerate: true, canPublish: false, canGodMode: false, canManageAdmins: false, canPricing: false },
  editor:      { canVerify: false, canModerate: false, canPublish: false, canGodMode: false, canManageAdmins: false, canPricing: false },
};

export function roleAllows(role: AppRole, permission: keyof typeof ROLE_DEFAULTS[AppRole]): boolean {
  const defaults = ROLE_DEFAULTS[role];
  if (defaults[permission]) return true;
  return false;
}