import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';

/**
 * GET /api/search/trending — VYTANEXA-BLUEPRINT.md § S05 "Trending
 * Searches" (State 1, empty search). Calls the get_trending_searches
 * RPC (DATABASE-SCHEMA.md, added this session) rather than exposing
 * that call to the client bundle directly — same server-side-first
 * pattern as /api/search.
 */
export async function GET() {
  const supabase = createClient();

  const [trendingRes, categoriesRes, voiceSearchEnabled] = await Promise.all([
    supabase.rpc('get_trending_searches', { p_limit: 8 }),
    supabase
      .from('categories')
      .select('id, slug, name_translations')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(6),
    // Piggybacked here rather than a separate request — this route
    // already fires once on mount before the mic button needs to
    // decide whether to render (app_settings.features.voice_search).
    isFeatureEnabled(supabase, 'voice_search'),
  ]);

  if (trendingRes.error) {
    console.error('trending search query failed:', trendingRes.error.message);
  }
  if (categoriesRes.error) {
    console.error('category shortcuts query failed:', categoriesRes.error.message);
  }

  return NextResponse.json({
    trending: trendingRes.data ?? [],
    categories: categoriesRes.data ?? [],
    voiceSearchEnabled,
  });
}
