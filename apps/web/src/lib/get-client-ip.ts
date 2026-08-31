import 'server-only';

/**
 * TODO.md Phase 8.5 — was `x-forwarded-for?.split(',')[0]` inlined
 * identically in 8 separate rate-limited routes. `x-real-ip` (when
 * present) is a single value Vercel's edge sets directly, so it's
 * preferred over the first segment of `x-forwarded-for`, which is
 * technically the client-supplied value in a raw multi-hop chain (a
 * client can send its own `X-Forwarded-For: 1.2.3.4` and have it
 * prepended rather than replaced, depending on the exact proxy
 * behavior in front of the app — verify against this project's actual
 * Vercel deployment per DEEPDIVE-REFACTOR-PLAN.md §5 open item).
 * Falls back to `x-forwarded-for`'s first segment, then 'unknown' —
 * same fallback every call site already had, just centralized so a
 * future hardening pass (e.g. switching to a platform-verified header)
 * is a one-file change instead of nine.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}
