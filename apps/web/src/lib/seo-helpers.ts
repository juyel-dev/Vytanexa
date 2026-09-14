/**
 * SEO helpers — VYTANEXA-BLUEPRINT.md § S21 "Content Generation Strategy"
 *
 * Title / H1 / intro / FAQ use admin-defined templates with variable
 * substitution {district}, {specialty}, {doctor_count} rather than fully
 * unique copy per page. The templates below are the code-side defaults
 * that match the spec's funnel intent; if app_settings.seo_defaults
 * holds admin-overridden templates (future Admin Panel A15), they could
 * be merged here — currently that table is empty and these defaults
 * drive everything, which is the correct fallback rather than rendering
 * empty strings.
 */

/**
 * SEO helpers — VYTANEXA-BLUEPRINT.md § S21 "Content Generation Strategy"
 *
 * Title / H1 / intro / FAQ use admin-defined templates with variable
 * substitution {district}, {specialty}, {doctor_count} rather than fully
 * unique copy per page. The templates themselves live in the `seo`
 * message namespace (messages/{locale}/seo.json) now — see
 * I18N-IMPLEMENTATION-SPEC.md's Phase 3 SEO batch — so a Hindi or
 * English crawler/visitor gets real Hindi/English metadata instead of
 * Bengali regardless of locale, which is what these functions exist to
 * prevent for the rest of the app's content. If app_settings.seo_defaults
 * ever holds admin-overridden templates (future Admin Panel A15), that
 * would need to layer on top of these per-locale message defaults rather
 * than replace them outright — currently that table is empty and these
 * defaults drive everything, which is the correct fallback rather than
 * rendering empty strings.
 */

import { getT } from '@vytanexa/i18n/server';
import { getFormatter } from './i18n';

export type SeoVars = {
  state: string;
  district: string;
  specialty: string;
  doctor_count: number;
};

export async function buildStateSeo(vars: SeoVars) {
  const t = await getT('seo.state');
  return {
    h1: t('h1', { state: vars.state }),
    title: t('title', { state: vars.state }),
    description: t('description', { state: vars.state }),
    intro: t('intro', { state: vars.state }),
  };
}

export async function buildDistrictSeo(vars: SeoVars) {
  const t = await getT('seo.district');
  return {
    h1: t('h1', { district: vars.district }),
    title: t('title', { district: vars.district }),
    description: t('description', { district: vars.district }),
    intro: t('intro', { district: vars.district }),
  };
}

export async function buildDistrictSpecialtySeo(vars: SeoVars) {
  const t = await getT('seo.districtSpecialty');
  const format = getFormatter();
  const doctorCount = format.number(vars.doctor_count);
  return {
    h1: t('h1', { district: vars.district, specialty: vars.specialty }),
    title: t('title', { district: vars.district, specialty: vars.specialty }),
    description: t('description', {
      district: vars.district,
      specialty: vars.specialty,
      doctor_count: doctorCount,
    }),
    intro: t('intro', {
      district: vars.district,
      specialty: vars.specialty,
      doctor_count: doctorCount,
    }),
  };
}

// --- Canonical / hreflang helpers ---

export function buildSeoUrls(
  appUrl: string,
  parts: { state: string; district?: string; specialty?: string }
): { canonical: string; alternates: Record<string, string> } {
  const path =
    parts.specialty && parts.district
      ? `/${parts.state}/${parts.district}/${parts.specialty}`
      : parts.district
        ? `/${parts.state}/${parts.district}`
        : `/${parts.state}`;
  const canonical = `${appUrl}${path}`;
  // Cookie-based locale (no URL prefix) per S02 §7 — hreflang alternates
  // still emitted for crawler benefit, pointing to the same URL with
  // the semantic locale tag.
  const alternates: Record<string, string> = {
    'x-default': canonical,
    bn: canonical,
    en: canonical,
    hi: canonical,
  };
  return { canonical, alternates };
}

// --- JSON-LD builders ---

export function buildBreadcrumbJsonLd(
  appUrl: string,
  crumbs: { name: string; url?: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.url ? { item: `${appUrl}${c.url}` } : {}),
    })),
  };
}

export function buildItemListJsonLd(
  appUrl: string,
  listName: string,
  doctors: { slug: string; name_translations: unknown }[]
) {
  // ItemList of doctors — uses the same shape as doctor-list.ts's
  // selected fields, keeping SEO structured data aligned with visible content.
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: doctors.length,
    itemListElement: doctors.map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${appUrl}/doctors/${d.slug}`,
    })),
  };
}

// FAQ: generic, variable-substituted — matches S21's "admin-authored
// generic FAQ template + variable substitution" note. Keeps the page
// non-thin even when doctor data is sparse.
export async function buildFaqItems(vars: SeoVars): Promise<{ question: string; answer: string }[]> {
  const t = await getT('seo.faq');
  const format = getFormatter();
  const doctorCount = format.number(vars.doctor_count);
  return [
    {
      question: t('visitFeeQuestion', { district: vars.district, specialty: vars.specialty }),
      answer: t('visitFeeAnswer'),
    },
    {
      question: t('appointmentQuestion', { district: vars.district, specialty: vars.specialty }),
      answer: t('appointmentAnswer'),
    },
    {
      question: t('countQuestion', { district: vars.district, specialty: vars.specialty }),
      answer: t('countAnswer', { district: vars.district, specialty: vars.specialty, count: doctorCount }),
    },
  ];
}

export function buildFaqJsonLd(
  faqs: { question: string; answer: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}
