import 'server-only';
import DOMPurify from 'isomorphic-dompurify';

/**
 * TODO.md Phase 8.5 / DEEPDIVE-REFACTOR-PLAN.md finding: `articles.body_html`
 * and `custom_pages` rich_text blocks' `content_html` were rendered on
 * apps/web via `dangerouslySetInnerHTML` with comments claiming
 * "sanitized server-side on write" — but nothing actually ran until
 * this. Admins author raw HTML in a plain `<textarea>`
 * (`ArticleForm.tsx`, `PageBuilder.tsx`) — not exploitable by ordinary
 * users today (only trusted admin/editor accounts can write it), but
 * a real stored-XSS surface the moment an editor account is
 * compromised, so every write path for these two fields must run
 * through here first.
 *
 * Allowlist matches what the two textareas are actually meant to
 * produce (paragraphs, headings, lists, links, images, basic
 * formatting) — mirrors the CSS hooks StaticBlocks.tsx / the article
 * detail page already style (`h2`, `img`, `p`). No `<script>`,
 * `<style>`, `<iframe>`, inline event handlers, or `javascript:` URLs
 * survive.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'a', 'img',
  'blockquote', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'class'];

export function sanitizeContentHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * `custom_pages.blocks` is a loosely-typed JSONB array
 * (`z.record(z.unknown())[]` in validations/custom-pages.ts) — only
 * the `rich_text` block type carries raw HTML (`content_html`,
 * confirmed against `PageBuilder.tsx` / `StaticBlocks.tsx`). Every
 * other block type (hero, image, cta_banner, faq_accordion,
 * doctor_grid, hospital_grid, poll, qa_embed, report_form, spacer)
 * stores structured fields, not HTML — left untouched.
 */
export function sanitizeCustomPageBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((block) => {
    if (
      block &&
      typeof block === 'object' &&
      (block as Record<string, unknown>).type === 'rich_text' &&
      typeof (block as Record<string, unknown>).content_html === 'string'
    ) {
      return {
        ...(block as Record<string, unknown>),
        content_html: sanitizeContentHtml((block as Record<string, unknown>).content_html as string),
      };
    }
    return block;
  });
}
