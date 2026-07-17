import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { event_type, entity_type, entity_id, metadata } = body;

    if (!event_type || typeof event_type !== 'string') {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase.from('analytics_events').insert({
      event_type,
      entity_type: entity_type ?? null,
      entity_id: entity_id ?? null,
      metadata: metadata ?? {},
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
