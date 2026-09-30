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
  const q = (request.nextUrl.searchParams.get('q')?.trim() ?? '').slice(0, 100);
  const rawLimit = Number(request.nextUrl.searchParams.get('limit') ?? '3');
  // Clamp: NaN / huge values would reach `.limit()` (abuse + errors).
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 50) : 3;
  // Analytics only for submitted searches (see below), never for
  // debounced autocomplete keystrokes.
  const track = request.nextUrl.searchParams.get('track') === '1';
  // Alias terms (e.g. হার্ট -> cardiolog) are searched as SEPARATE
  // OR-ed patterns. Previously the client glued them into one string
  // ("হার্ট cardiology") which as a single ILIKE pattern matched nothing.
  const extraTerms = request.nextUrl.searchParams
    .getAll('alias')
    .map((a) => a.trim())
    .filter((a) => a.length >= 2 && a.length <= 40)
    .slice(0, 3);

  if (q.length < 2) {
    return NextResponse.json({ doctors: [], hospitals: [], categories: [], symptoms: [] });
  }

  const supabase = createClient();
  // Escape ILIKE wildcards so a user typing % or _ can't inject their
  // own wildcards (broken/unexpected results, slow scans on big tables).
  // Also neutralize ,()" — PostgREST's `or=` param uses commas/parens
  // as syntax, so a raw comma in the query would corrupt the filter.
  const toPattern = (text: string) => {
    const safe = text.replace(/[,()"']/g, ' ');
    return `%${safe.replace(/[%_\\]/g, '\\$&')}%`;
  };
  const patterns = [q, ...extraTerms].map(toPattern);
  const orFor = (bn: string, en: string) =>
    patterns.flatMap((pt) => [`${bn}.ilike.${pt}`, `${en}.ilike.${pt}`]).join(',');
  const nameOr = orFor('name_translations->>bn', 'name_translations->>en');

  const [doctorsRes, hospitalsRes, categoriesRes, symptomsRes] = await Promise.all([
    supabase
      .from('doctors')
      .select('id, slug, name_translations, photo_url, categories(name_translations)')
      .eq('verification_status', 'verified')
      .or(nameOr)
      .limit(limit),
    supabase
      .from('hospitals')
      .select('id, slug, name_translations, type')
      .eq('verification_status', 'verified')
      .or(nameOr)
      .limit(limit),
    supabase
      .from('categories')
      .select('id, slug, name_translations')
      .eq('is_active', true)
      .or(nameOr)
      .limit(limit),
    supabase
      .from('symptoms')
      .select('id, slug, title_translations')
      .eq('is_active', true)
      .or(orFor('title_translations->>bn', 'title_translations->>en'))
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
  // Every section failed => this is an outage, not "no results". Tell
  // the client (500) so it can show a retry state instead of the
  // misleading "nothing found" screen.
  if (errors.length === 4) {
    return NextResponse.json({ error: 'search_failed' }, { status: 500 });
  }

  // Fire-and-forget analytics feeding get_trending_searches. Only for
  // submitted searches: logging every debounced autocomplete request
  // filled trending with partial keystrokes ("kar", "kard", ...).
  if (track) {
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
  }

  return NextResponse.json({
    doctors: doctorsRes.data ?? [],
    hospitals: hospitalsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    symptoms: symptomsRes.data ?? [],
  });
}
