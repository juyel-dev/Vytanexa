import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchTests } from '@/lib/queries/test-search';

/**
 * GET /api/test-search?q=... — VYTANEXA-BLUEPRINT.md § S10 "SEARCH
 * BEHAVIOR": "Debounce 300ms, min 2 chars." Route Handler rather than
 * client-side Supabase queries, same rationale as `/api/search`
 * (S05) — keeps the Supabase client bundle out of the Lab Tests
 * page's client JS.
 *
 * Analytics: `test_search { query, results_count }` per spec's own
 * § "Analytics" note — "critical for admin to see which tests are
 * searched-but-unavailable in a district (expansion signal)."
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ results: [], matchedTests: [] });
  }

  const supabase = createClient();
  const { results, matchedTests } = await searchTests(supabase, q);

  void supabase
    .from('analytics_events')
    .insert({
      event_type: 'test_search',
      metadata: { query: q, results_count: results.length },
    })
    .then(() => {});

  return NextResponse.json({ results, matchedTests });
}
