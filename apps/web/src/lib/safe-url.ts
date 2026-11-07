/**
 * Admin-authored URLs (CTA buttons etc.) are free text. Allow only
 * same-site paths and http(s)/tel/mailto; anything else (javascript:,
 * data:, protocol-relative //host) is dropped so it can never become
 * a clickable script link.
 */
export function safeHref(url: string | undefined | null): string | null {
  const u = (url ?? '').trim();
  if (!u) return null;
  if (u.startsWith('/') && !u.startsWith('//')) return u;
  return /^(https?:|tel:|mailto:)/i.test(u) ? u : null;
}
