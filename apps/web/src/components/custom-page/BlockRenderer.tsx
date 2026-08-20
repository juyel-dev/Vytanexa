import {
  HeroBlockView,
  RichTextBlockView,
  ImageBlockView,
  CtaBannerBlockView,
  SpacerBlockView,
} from './StaticBlocks';
import { PollEmbedBlockView } from './PollEmbedBlockView';
import { QAEmbedBlockView } from './QAEmbedBlockView';
import { ReportFormBlockView } from './ReportFormBlockView';
import { FaqAccordionBlockView } from './FaqAccordionBlockView';
import { MagazineGridBlockView, DoctorGridBlockView, HospitalGridBlockView } from './GridBlocks';
import type { PageBlock } from '@/lib/custom-page-blocks';

/**
 * Block Renderer — VYTANEXA-BLUEPRINT.md § S19: "each block type maps
 * 1:1 to a React component in a BlockRenderer switch... unknown/future
 * block types render nothing (fail-safe, doesn't crash page) rather
 * than erroring, so admin can add new block types over time without
 * breaking already-published pages built with the older set."
 *
 * An async Server Component (most blocks fetch their own data — polls,
 * Q&A, grids); the two blocks needing client-side interaction
 * (`faq_accordion`'s accordion state, `report_form`'s dynamic form
 * state) are their own small Client Components, rendered inline here
 * same as any other block — Server Components can render Client
 * Components directly, no special handling needed at this boundary.
 */
export async function BlockRenderer({
  block,
  pageId,
  blockIndex,
}: {
  block: PageBlock;
  pageId: string;
  blockIndex: number;
}) {
  switch (block.type) {
    case 'hero':
      return <HeroBlockView block={block} />;
    case 'rich_text':
      return <RichTextBlockView block={block} />;
    case 'image':
      return <ImageBlockView block={block} />;
    case 'cta_banner':
      return <CtaBannerBlockView block={block} />;
    case 'spacer':
    case 'divider':
      return <SpacerBlockView block={block} />;
    case 'poll':
      return <PollEmbedBlockView block={block} />;
    case 'qa_embed':
      return <QAEmbedBlockView block={block} />;
    case 'report_form':
      return <ReportFormBlockView block={block} pageId={pageId} blockIndex={blockIndex} />;
    case 'faq_accordion':
      return <FaqAccordionBlockView block={block} />;
    case 'magazine_grid':
      return <MagazineGridBlockView block={block} />;
    case 'doctor_grid':
      return <DoctorGridBlockView block={block} />;
    case 'hospital_grid':
      return <HospitalGridBlockView block={block} />;
    default:
      // Unknown block type (future block added by a newer admin panel
      // version, or malformed JSON) — render nothing, never crash.
      return null;
  }
}
