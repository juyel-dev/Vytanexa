/**
 * Custom Page Block Types — VYTANEXA-BLUEPRINT.md § S19 "Block Data
 * Shape (Reference)". These types describe the JSONB shape stored in
 * `custom_pages.blocks` — admin-authored, no fixed schema beyond
 * this contract. `BlockRenderer` (`components/custom-page/
 * BlockRenderer.tsx`) is the single switch that maps each `type` to
 * a component; unknown/malformed blocks render nothing rather than
 * crashing the page (spec: "fail-safe, doesn't crash page").
 *
 * Kept loosely typed (most fields optional, no strict discriminated
 * union enforcement at the JSON-parsing boundary) because this data
 * comes from JSONB with no DB-level schema validation — the runtime
 * fail-safe in `BlockRenderer` is the actual safety net, not the
 * TypeScript types, which exist for editor ergonomics once the Admin
 * Panel's page builder is built.
 */

export type HeroBlock = {
  type: 'hero';
  image?: string;
  title?: string;
  subtitle?: string;
};

export type RichTextBlock = {
  type: 'rich_text';
  content_html?: string;
};

export type ImageBlock = {
  type: 'image';
  image?: string;
  caption?: string;
};

export type PollBlock = {
  type: 'poll';
  poll_id?: string;
};

export type QAEmbedBlock = {
  type: 'qa_embed';
  question_id?: string;
};

export type ReportFormField = {
  key: string;
  label: string;
  field_type: 'text' | 'select' | 'checkbox';
  options?: string[]; // for select
  required?: boolean;
};

export type ReportFormBlock = {
  type: 'report_form';
  heading?: string;
  fields?: ReportFormField[];
};

export type MagazineGridBlock = {
  type: 'magazine_grid';
  heading?: string;
  category?: string;
  tags?: string[];
  limit?: number;
};

export type DoctorGridBlock = {
  type: 'doctor_grid';
  heading?: string;
  doctor_ids?: string[];
};

export type HospitalGridBlock = {
  type: 'hospital_grid';
  heading?: string;
  hospital_ids?: string[];
};

export type CtaBannerBlock = {
  type: 'cta_banner';
  headline?: string;
  button_text?: string;
  button_url?: string;
  color?: string;
};

export type FaqAccordionBlock = {
  type: 'faq_accordion';
  heading?: string;
  items?: { question: string; answer: string }[];
};

export type SpacerBlock = {
  type: 'spacer' | 'divider';
  size?: 'sm' | 'md' | 'lg';
};

export type PageBlock =
  | HeroBlock
  | RichTextBlock
  | ImageBlock
  | PollBlock
  | QAEmbedBlock
  | ReportFormBlock
  | MagazineGridBlock
  | DoctorGridBlock
  | HospitalGridBlock
  | CtaBannerBlock
  | FaqAccordionBlock
  | SpacerBlock;
