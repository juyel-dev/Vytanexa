import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@vytanexa/database';
import { analyticsSchema } from '@/lib/validations/analytics';

/**
 * POST /api/analytics — VYTANEXA-BLUEPRINT.md § S07 "Analytics Events",
 * generic across every screen (search, shares, ad clicks, etc.).
 * Writes to `analytics_events` (DATABASE-SCHEMA.md § 5.5) via the RLS
 * `analytics_public_insert` policy (INSERT-only, no read-back —
 * DATABASE-SCHEMA.md § 5.9) — this route is a thin, honest pass-through
 * to that policy, not a privileged bypass.
 *
 * Deliberately fire-and-forget from the client's perspective: analytics
 * failures must never surface as user-facing errors, so this handler
 * always returns 204 even on a logged server-side failure.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyticsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }
    const { event_type, entity_type, entity_id, metadata } = parsed.data;

    // Metadata size cap — analytics is fire-and-forget from the client's
    // perspective, but an uncapped JSONB column is a cheap abuse vector
    // (a script posting MBs per event). 2KB covers every legitimate
    // event this app sends (search query, poll id, ad id + labels).
    if (metadata && JSON.stringify(metadata).length > 2048) {
      return NextResponse.json({ error: 'metadata too large' }, { status: 400 });
    }

    const supabase = createClient();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_key: `analytics:${ip}`,
      p_max_count: 120,
      p_window: '1 hour',
    });

    if (rateLimitError) {
      console.error('rate limit check failed:', rateLimitError.message);
    } else if (!allowed) {
      // Still 204, not 429 — analytics must never surface as a
      // user-facing error; we just silently drop the excess.
      return new NextResponse(null, { status: 204 });
    }
    const { error } = await supabase.from('analytics_events').insert({
      event_type,
      entity_type: entity_type ?? null,
      entity_id: entity_id ?? null,
      metadata: (metadata ?? {}) as unknown as Json,
      device_type: request.headers.get('user-agent')?.includes('Mobile')
        ? 'mobile'
        : 'desktop',
    });

    if (error) {
      console.error('analytics insert failed:', error.message);
    }
  } catch (err) {
    console.error('analytics route error:', err);
  }

  // Always 204 — see fire-and-forget rationale above.
  return new NextResponse(null, { status: 204 });
}
