import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Article Detail Query — VYTANEXA-BLUEPRINT.md § S13. Same
 * one-function-for-metadata-and-body pattern as S07/S08/S09.
 *
 * `body_html` is stored already-sanitized at write time (Admin
 * Panel's job, per DATABASE-SCHEMA.md § "articles" comment: "sanitized
 * server-side on write"). Rendered via `dangerouslySetInnerHTML` in
 * the detail client — safe under the current trust model (only
 * `is_admin()`-gated writers can ever set this field; RLS blocks all
 * public writes to `articles`), but worth flagging plainly here since
 * the Admin Panel's rich-text editor (not yet built) is what actually
 * has to honor that sanitization contract when it lands.
 */
export async function getArticleBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data: article, error } = await supabase
    .from('articles')
    .select(
      `*, author:doctors!articles_author_doctor_id_fkey(slug, name_translations, photo_url, category_id, categories(name_translations))`
    )
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !article) return null;
  return article;
}

export type ArticleDetail = NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>;

/** Related articles — same category, excluding the current one. */
export async function getRelatedArticles(
  supabase: SupabaseClient<Database>,
  category: string | null,
  excludeId: string
) {
  if (!category) return [];
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, title_translations, cover_image_url, category, read_time_minutes')
    .eq('is_published', true)
    .eq('category', category)
    .neq('id', excludeId)
    .order('published_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error('getRelatedArticles failed:', error.message);
    return [];
  }
  return data ?? [];
}
