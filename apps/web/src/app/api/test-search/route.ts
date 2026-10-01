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
 * Analytics (`test_search`) is NOT logged here: this endpoint is hit on
 * every debounced keystroke, which would record partial queries ("cb",
 * "cbc"). The client logs once per settled query via `/api/analytics`
 * (rate-limited), which also knows the final result count.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q')?.trim() ?? '').slice(0, 100);
  const district = request.nextUrl.searchParams.get('district') ?? undefined;

  if (q.length < 2) {
    return NextResponse.json({ results: [], matchedTests: [] });
  }

  try {
    const supabase = createClient();
    const { results, matchedTests } = await searchTests(supabase, q, district);
    return NextResponse.json({ results, matchedTests });
  } catch (err) {
    console.error('test-search failed:', err);
    // 500 (not an empty 200) so the UI shows an error + retry instead of
    // the misleading "no center offers this test" empty state.
    return NextResponse.json({ error: 'test_search_failed' }, { status: 500 });
  }
}
