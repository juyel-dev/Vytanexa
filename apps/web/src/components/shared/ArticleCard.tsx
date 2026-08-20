import Link from 'next/link';
import Image from 'next/image';
import { getLocalizedField, formatRelativeTimeBn, toBengaliDigits } from '@/lib/i18n';
import type { Json } from '@vytanexa/database';

export type ArticleCardData = {
  id: string;
  slug: string;
  title_translations: Json;
  cover_image_url: string | null;
  category: string | null;
  read_time_minutes: number | null;
  author_name?: string | null;
  published_at?: string | null;
};

/**
 * Article Card — VYTANEXA-BLUEPRINT.md § S13, extracted from
 * `articles/ArticleListClient.tsx` so VYTANEXA-BLUEPRINT.md § S19's
 * `magazine_grid` block can reuse the identical card rather than a
 * near-duplicate — matches the `DoctorCard`/`HospitalCard` sharing
 * pattern already established for S06/S08. `author_name`/
 * `published_at` are optional since S19's grid block query doesn't
 * fetch them (a curated content grid, not a chronological feed) —
 * `ArticleMeta` already degrades gracefully when fields are absent.
 */
export function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <Link href={`/community/articles/${article.slug}`} className="block">
      <div className="relative h-[100px] w-full overflow-hidden rounded-lg bg-neutral-100">
        {article.cover_image_url && (
          <Image
            src={article.cover_image_url}
            alt={getLocalizedField(article.title_translations)}
            fill
            sizes="50vw"
            className="object-cover"
          />
        )}
        {article.category && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
            {article.category}
          </span>
        )}
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-[13px] font-semibold text-neutral-900">
        {getLocalizedField(article.title_translations)}
      </h3>
      <ArticleMeta article={article} compact />
    </Link>
  );
}

export function ArticleMeta({
  article,
  compact,
}: {
  article: ArticleCardData;
  compact?: boolean;
}) {
  const bits = [
    article.author_name,
    article.read_time_minutes ? `${toBengaliDigits(article.read_time_minutes)} মিনিট পড়া` : null,
    article.published_at ? formatRelativeTimeBn(article.published_at) : null,
  ].filter(Boolean);

  if (bits.length === 0) return null;

  return (
    <p className={`mt-1 text-neutral-500 ${compact ? 'text-[11px]' : 'text-[12px]'}`}>
      {bits.join('  ·  ')}
    </p>
  );
}
