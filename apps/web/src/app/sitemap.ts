import type { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Sitemap — VYTANEXA-BLUEPRINT.md § S21 "Technical SEO"
 * XML sitemap auto-generated enumerating generated SEO pages plus the
 * rest of the crawlable app (doctor/hospital detail, symptoms, articles,
 * custom pages). Next.js serves this at /sitemap.xml automatically.
 *
 * Guardrail: SEO landing pages only enumerated where doctor_count >= 1
 * (same predicate as generateStaticParams). If DB is empty or unreachable
 * at build time, falls back to static routes only — never throws.
 */

export const revalidate = 3600;

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient<Database>(url, key);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vytanexa.app';
  const now = new Date();

  // Static routes — always present, no DB dependency.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${appUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${appUrl}/doctors`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${appUrl}/hospitals`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${appUrl}/symptoms`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${appUrl}/health/lab-tests`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${appUrl}/health/blood-services`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${appUrl}/emergency`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${appUrl}/community/articles`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${appUrl}/community/qa`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${appUrl}/community/polls`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${appUrl}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${appUrl}/more`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const supabase = supa();
  if (!supabase) return staticRoutes;

  try {
    const [
      { data: doctors },
      { data: hospitals },
      { data: symptoms },
      { data: articles },
      { data: customPages },
      { data: locations },
      { data: categories },
    ] = await Promise.all([
      supabase.from('doctors').select('slug, updated_at').eq('verification_status', 'verified').limit(5000),
      supabase.from('hospitals').select('slug, updated_at').eq('verification_status', 'verified').limit(5000),
      supabase.from('symptoms').select('slug, updated_at').eq('is_active', true).limit(2000),
      supabase.from('articles').select('slug, updated_at').eq('is_published', true).limit(2000),
      supabase.from('custom_pages').select('slug, updated_at').eq('is_published', true).limit(1000),
      supabase.from('locations').select('id, slug, type, parent_id').eq('is_active', true).is('deleted_at', null).limit(10000),
      supabase.from('categories').select('id, slug').eq('is_active', true).is('deleted_at', null).limit(1000),
    ]);

    const entries: MetadataRoute.Sitemap = [...staticRoutes];

    for (const d of doctors ?? []) {
      entries.push({
        url: `${appUrl}/doctors/${d.slug}`,
        lastModified: d.updated_at ? new Date(d.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
    for (const h of hospitals ?? []) {
      entries.push({
        url: `${appUrl}/hospitals/${h.slug}`,
        lastModified: h.updated_at ? new Date(h.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
    for (const s of symptoms ?? []) {
      entries.push({
        url: `${appUrl}/symptoms/${s.slug}`,
        lastModified: s.updated_at ? new Date(s.updated_at) : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
    for (const a of articles ?? []) {
      entries.push({
        url: `${appUrl}/community/articles/${a.slug}`,
        lastModified: a.updated_at ? new Date(a.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
    for (const p of customPages ?? []) {
      entries.push({
        url: `${appUrl}/page/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    // SEO landing pages — state / district / state+district+specialty
    const locs = (locations ?? []) as { id: string; slug: string; type: string; parent_id: string | null }[];
    const states = locs.filter((l) => l.type === 'state');
    const districts = locs.filter((l) => l.type === 'district');
    const stateById = new Map(states.map((s) => [s.id, s]));

    for (const s of states) {
      entries.push({ url: `${appUrl}/${s.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
    }

    for (const d of districts) {
      const st = d.parent_id ? stateById.get(d.parent_id) : null;
      if (!st) continue;
      entries.push({
        url: `${appUrl}/${st.slug}/${d.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // Specialty combo — only where specialty has ≥1 doctor (guardrail).
    // Head counts per category in parallel, same as seo.ts helper.
    const cats = (categories ?? []) as { id: string; slug: string }[];
    if (cats.length > 0 && districts.length > 0 && states.length > 0) {
      const counts = await Promise.all(
        cats.map(async (c) => {
          const { count } = await supabase
            .from('doctors')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', c.id)
            .eq('verification_status', 'verified');
          return { cat: c, count: count ?? 0 };
        })
      );
      const activeCats = counts.filter((c) => c.count > 0).map((c) => c.cat);
      for (const d of districts) {
        const st = d.parent_id ? stateById.get(d.parent_id) : null;
        if (!st) continue;
        for (const cat of activeCats) {
          entries.push({
            url: `${appUrl}/${st.slug}/${d.slug}/${cat.slug}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      }
    }

    return entries;
  } catch {
    // Network / RLS error at build time — degrade to static routes only.
    return staticRoutes;
  }
}
