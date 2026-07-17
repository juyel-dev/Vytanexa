import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getLocalizedField } from '@/lib/i18n';

/**
 * Health Articles — VYTANEXA-BLUEPRINT.md § S04 SEC-10
 * Conditional: entire section hidden unless published articles exist,
 * per spec.
 */
export async function HealthArticles() {
  const supabase = createClient();

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, slug, title_translations, cover_image_url, category, read_time_minutes')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('HealthArticles query failed:', error.message);
    return null;
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  const [featured, ...rest] = articles;

  return (
    <section className="py-3">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="font-bengali-display text-[17px] font-bold text-neutral-900">
          স্বাস্থ্য টিপস ও তথ্য
        </h2>
        <Link href="/community/articles" className="text-[13px] text-brand-600">
          সব দেখুন →
        </Link>
      </div>

      {featured && (
        <Link href={`/community/articles/${featured.slug}`} className="mx-4 mb-3 block">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-100">
            {featured.cover_image_url && (
              <Image
                src={featured.cover_image_url}
                alt={getLocalizedField(featured.title_translations)}
                fill
                sizes="100vw"
                className="object-cover"
              />
            )}
          </div>
          {featured.category && (
            <span className="mt-2 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600">
              {featured.category}
            </span>
          )}
          <h3 className="mt-1 line-clamp-2 text-[15px] font-bold text-neutral-900">
            {getLocalizedField(featured.title_translations)}
          </h3>
        </Link>
      )}

      {rest.length > 0 && (
        <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {rest.map((a) => (
            <Link
              key={a.id}
              href={`/community/articles/${a.slug}`}
              className="w-[200px] shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              <div className="relative aspect-video w-full bg-neutral-100">
                {a.cover_image_url && (
                  <Image
                    src={a.cover_image_url}
                    alt={getLocalizedField(a.title_translations)}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-2">
                <h4 className="line-clamp-2 text-[13px] font-semibold text-neutral-900">
                  {getLocalizedField(a.title_translations)}
                </h4>
                {a.read_time_minutes && (
                  <p className="mt-1 text-[11px] text-neutral-400">
                    {a.read_time_minutes} মিনিট পড়া
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
