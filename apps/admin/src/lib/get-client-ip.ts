import 'server-only';

/**
 * TODO.md Phase 8.5. Mirrors apps/web/src/lib/get-client-ip.ts —
 * duplicated rather than shared since the two apps have no common
 * utils package (consistent with the rest of the monorepo's existing
 * duplication between apps/web and apps/admin). See that file's
 * comment for the `x-real-ip` vs `x-forwarded-for` reasoning.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}
