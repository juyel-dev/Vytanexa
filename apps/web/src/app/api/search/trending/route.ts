import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/search/trending — VYTANEXA-BLUEPRINT.md § S05 "Trending
 * Searches" (State 1, empty search). Calls the get_trending_searches
 * RPC (DATABASE-SCHEMA.md, added this session) rather than exposing
 * that call to the client bundle directly — same server-side-first
 * pattern as /api/search.
 */
export async function GET() {
  const supabase = createClient();

  const [trendingRes, categoriesRes] = await Promise.all([
    supabase.rpc('get_trending_searches', { p_limit: 8 }),
    supabase
      .from('categories')
      .select('id, slug, name_translations')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(6),
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
  });
}
