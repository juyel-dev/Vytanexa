import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/search?q=... — VYTANEXA-BLUEPRINT.md § S05
 * "SEARCH QUERY MATCHING LOGIC". Runs the parallel doctor/hospital/
 * category/symptom queries server-side (Route Handler) rather than
 * from the client — keeps the Supabase client bundle out of the
 * Search page's client JS entirely, learned from the Home page's
 * bundle-size lesson earlier in this project.
 *
 * `limit` query param controls per-type result count: small for the
 * autocomplete dropdown (S05 DROPDOWN_LIMITS), larger for the full
 * results page.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '3');

  if (q.length < 2) {
    return NextResponse.json({ doctors: [], hospitals: [], categories: [], symptoms: [] });
  }

  const supabase = createClient();
  const pattern = `%${q}%`;

  const [doctorsRes, hospitalsRes, categoriesRes, symptomsRes] = await Promise.all([
    supabase
      .from('doctors')
      .select('id, slug, name_translations, photo_url, categories(name_translations)')
      .eq('verification_status', 'verified')
      .or(`name_translations->>bn.ilike.${pattern},name_translations->>en.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('hospitals')
      .select('id, slug, name_translations, type')
      .eq('verification_status', 'verified')
      .or(`name_translations->>bn.ilike.${pattern},name_translations->>en.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('categories')
      .select('id, slug, name_translations')
      .eq('is_active', true)
      .or(`name_translations->>bn.ilike.${pattern},name_translations->>en.ilike.${pattern}`)
      .limit(limit),
    supabase
      .from('symptoms')
      .select('id, slug, title_translations')
      .eq('is_active', true)
      .or(`title_translations->>bn.ilike.${pattern},title_translations->>en.ilike.${pattern}`)
      .limit(limit),
  ]);

  const errors = [
    doctorsRes.error,
    hospitalsRes.error,
    categoriesRes.error,
    symptomsRes.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    console.error('search route query errors:', errors);
  }

  // Fire-and-forget analytics (the search-tracking event that feeds
  // get_trending_searches) -- doesn't block the response.
  const totalResults =
    (doctorsRes.data?.length ?? 0) +
    (hospitalsRes.data?.length ?? 0) +
    (categoriesRes.data?.length ?? 0) +
    (symptomsRes.data?.length ?? 0);
  void supabase
    .from('analytics_events')
    .insert({
      event_type: 'search',
      metadata: { query: q, result_count: totalResults },
    })
    .then(() => {});

  return NextResponse.json({
    doctors: doctorsRes.data ?? [],
    hospitals: hospitalsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    symptoms: symptomsRes.data ?? [],
  });
}
