import Link from 'next/link';
import Image from 'next/image';
import type {
  HeroBlock,
  RichTextBlock,
  ImageBlock,
  CtaBannerBlock,
  SpacerBlock,
} from '@/lib/custom-page-blocks';

export function HeroBlockView({ block }: { block: HeroBlock }) {
  return (
    <div className="relative h-[220px] w-full bg-neutral-200">
      {block.image && <Image src={block.image} alt={block.title ?? ''} fill className="object-cover" />}
      {(block.title || block.subtitle) && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-4">
          {block.title && (
            <h2 className="text-[20px] font-bold leading-snug text-white">{block.title}</h2>
          )}
          {block.subtitle && <p className="mt-1 text-[14px] text-white/90">{block.subtitle}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * `rich_text` block — VYTANEXA-BLUEPRINT.md § S19: "same renderer as
 * Article body, S13." Same trust model as `ArticleDetailClient`'s
 * `body_html` — admin-authored, sanitized server-side on write (Admin
 * Panel's job, not built yet).
 */
export function RichTextBlockView({ block }: { block: RichTextBlock }) {
  if (!block.content_html) return null;
  return (
    <div className="px-4 py-4">
      {/* eslint-disable-next-line react/no-danger -- admin-authored, sanitized on write; same trust model as ArticleDetailClient's body_html */}
      <div
        className="prose prose-neutral max-w-none text-[16px] leading-[1.6] text-neutral-800 [&_h2]:mt-6 [&_h2]:text-[18px] [&_h2]:font-bold [&_img]:rounded-lg [&_p]:mb-4"
        dangerouslySetInnerHTML={{ __html: block.content_html }}
      />
    </div>
  );
}

export function ImageBlockView({ block }: { block: ImageBlock }) {
  if (!block.image) return null;
  return (
    <div className="px-4 py-3">
      <div className="relative h-[200px] w-full overflow-hidden rounded-lg bg-neutral-100">
        <Image src={block.image} alt={block.caption ?? ''} fill className="object-cover" />
      </div>
      {block.caption && (
        <p className="mt-1.5 text-center text-[12px] text-neutral-500">{block.caption}</p>
      )}
    </div>
  );
}

const BANNER_COLORS: Record<string, string> = {
  brand: 'bg-brand-600',
  emergency: 'bg-emergency-600',
  life: 'bg-life-600',
  accent: 'bg-accent-500',
};

export function CtaBannerBlockView({ block }: { block: CtaBannerBlock }) {
  if (!block.headline) return null;
  const bgClass = BANNER_COLORS[block.color ?? 'brand'] ?? BANNER_COLORS.brand;
  const isExternal = block.button_url?.startsWith('http');

  return (
    <div className={`mx-4 my-3 rounded-xl p-5 text-center ${bgClass}`}>
      <p className="text-[17px] font-bold text-white">{block.headline}</p>
      {block.button_text && block.button_url && (
        <Link
          href={block.button_url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="mt-3 inline-block rounded-md bg-white px-5 py-2.5 text-[14px] font-semibold text-neutral-900"
        >
          {block.button_text}
        </Link>
      )}
    </div>
  );
}

const SPACER_SIZES: Record<string, string> = { sm: 'h-4', md: 'h-8', lg: 'h-16' };

export function SpacerBlockView({ block }: { block: SpacerBlock }) {
  if (block.type === 'divider') {
    return <hr className="mx-4 my-4 border-neutral-100" />;
  }
  return <div className={SPACER_SIZES[block.size ?? 'md'] ?? SPACER_SIZES.md} />;
}
