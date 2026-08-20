import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { BlockRenderer } from '@/components/custom-page/BlockRenderer';
import { createClient } from '@/lib/supabase/server';
import { getCustomPageBySlug } from '@/lib/queries/custom-page';
import type { PageBlock } from '@/lib/custom-page-blocks';

// SSR (not SSG) with short ISR revalidate per S19: "content changes
// without redeploy and freshness matters more than build-time caching
// here." Same cookies()-inside-createClient() caveat as other pages
// in this app (ends up dynamically rendered per-request in practice).
export const revalidate = 60;

async function loadPage(slug: string) {
  const supabase = createClient();
  return getCustomPageBySlug(supabase, slug);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const page = await loadPage(params.slug);
  if (!page) return { title: 'পাওয়া যায়নি | Vytanexa' };

  const title = page.meta_title || page.title;
  const description = page.meta_description || undefined;

  // OG image fallback: first hero or image block, per spec.
  const blocks = (page.blocks as unknown as PageBlock[]) ?? [];
  const firstImageBlock = blocks.find(
    (b): b is Extract<PageBlock, { type: 'hero' | 'image' }> =>
      (b.type === 'hero' || b.type === 'image') && !!b.image
  );

  return {
    title: `${title} | Vytanexa`,
    description,
    openGraph: {
      title: `${title} | Vytanexa`,
      description,
      images: page.og_image
        ? [page.og_image]
        : firstImageBlock?.image
          ? [firstImageBlock.image]
          : undefined,
      type: 'website',
    },
  };
}

/**
 * Custom Page — VYTANEXA-BLUEPRINT.md § S19 (`/page/[slug]`). "The
 * user-app-side rendering half of Admin God Mode's page builder ...
 * No code release needed to publish a new page." `is_published`
 * filtering already happens at the RLS layer
 * (`custom_pages_public_read`), so a 404 here correctly covers both
 * "doesn't exist" and "exists but unpublished" without needing to
 * distinguish them.
 */
export default async function CustomPage({ params }: { params: { slug: string } }) {
  const page = await loadPage(params.slug);
  if (!page) notFound();

  const blocks = (page.blocks as unknown as PageBlock[]) ?? [];

  return (
    <>
      <TopBarSection title={page.title} />
      <div className="pb-8">
        {blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} pageId={page.id} blockIndex={i} />
        ))}
      </div>
    </>
  );
}
