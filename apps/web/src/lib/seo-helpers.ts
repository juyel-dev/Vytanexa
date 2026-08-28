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

import { toBengaliDigits } from './i18n';

export type SeoVars = {
  state: string;
  district: string;
  specialty: string;
  doctor_count: number;
};

function interpolate(template: string, vars: SeoVars): string {
  return template
    .replaceAll('{state}', vars.state)
    .replaceAll('{district}', vars.district)
    .replaceAll('{specialty}', vars.specialty)
    .replaceAll('{doctor_count}', toBengaliDigits(vars.doctor_count));
}

// Default templates — Bengali, matching S21's long-tail intent
// e.g. "কোচবিহারে হৃদরোগ বিশেষজ্ঞ ডাক্তার"
export const SEO_TEMPLATES = {
  districtSpecialty: {
    // H1
    h1: '{district}-এ {specialty} বিশেষজ্ঞ ডাক্তার',
    // Meta title (search-result headline)
    title: '{district}-এ {specialty} বিশেষজ্ঞ ডাক্তার | Vytanexa',
    // Meta description (search-result snippet)
    description:
      '{district} জেলায় {doctor_count} জন অভিজ্ঞ {specialty} বিশেষজ্ঞ খুঁজে পান। ভেরিফাইড প্রোফাইল, রিভিউ ও সরাসরি যোগাযোগের সুবিধা — Vytanexa।',
    // Intro paragraph under H1
    intro:
      '{district} জেলায় {doctor_count} জন অভিজ্ঞ {specialty} বিশেষজ্ঞ খুঁজে পান। ভেরিফাইড প্রোফাইল, রিভিউ ও সরাসরি যোগাযোগের সুবিধা।',
  },
  district: {
    h1: '{district}-এ ডাক্তার ও স্বাস্থ্যসেবা',
    title: '{district}-এ সেরা ডাক্তার ও হাসপাতাল | Vytanexa',
    description:
      '{district} জেলায় সেরা ডাক্তার, হাসপাতাল, ডায়াগনস্টিক ও জরুরি সেবা খুঁজুন — Vytanexa, আপনার স্বাস্থ্য, আপনার সংযোগ।',
    intro:
      '{district} জেলার সেরা স্বাস্থ্যসেবা এক জায়গায় — বিশেষজ্ঞ ডাক্তার, হাসপাতাল ও জরুরি সেবা খুঁজুন।',
  },
  state: {
    h1: '{state}-এ স্বাস্থ্যসেবা',
    title: '{state}-এ ডাক্তার, হাসপাতাল ও জরুরি সেবা | Vytanexa',
    description:
      '{state}-এর সেরা ডাক্তার ও হাসপাতাল খুঁজুন জেলা অনুযায়ী। ভেরিফাইড প্রোফাইল ও সরাসরি যোগাযোগ — Vytanexa।',
    intro:
      '{state}-এর প্রতিটি জেলায় সেরা ডাক্তার ও হাসপাতাল খুঁজুন। জেলা বেছে নিয়ে বিশেষজ্ঞ অনুযায়ী ফিল্টার করুন।',
  },
} as const;

export function buildDistrictSpecialtySeo(vars: SeoVars) {
  return {
    h1: interpolate(SEO_TEMPLATES.districtSpecialty.h1, vars),
    title: interpolate(SEO_TEMPLATES.districtSpecialty.title, vars),
    description: interpolate(SEO_TEMPLATES.districtSpecialty.description, vars),
    intro: interpolate(SEO_TEMPLATES.districtSpecialty.intro, vars),
  };
}

export function buildDistrictSeo(vars: SeoVars) {
  return {
    h1: interpolate(SEO_TEMPLATES.district.h1, vars),
    title: interpolate(SEO_TEMPLATES.district.title, vars),
    description: interpolate(SEO_TEMPLATES.district.description, vars),
    intro: interpolate(SEO_TEMPLATES.district.intro, vars),
  };
}

export function buildStateSeo(vars: SeoVars) {
  return {
    h1: interpolate(SEO_TEMPLATES.state.h1, vars),
    title: interpolate(SEO_TEMPLATES.state.title, vars),
    description: interpolate(SEO_TEMPLATES.state.description, vars),
    intro: interpolate(SEO_TEMPLATES.state.intro, vars),
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
export function buildFaqItems(vars: SeoVars): { question: string; answer: string }[] {
  return [
    {
      question: `${vars.district}-এ ${vars.specialty} ডাক্তারের ভিজিট ফি কত?`,
      answer: `ভিজিট ফি ডাক্তার অনুযায়ী ভিন্ন — সাধারণত ₹২০০–₹১৫০০ এর মধ্যে। প্রতিটি প্রোফাইলে ফি স্পষ্টভাবে দেখানো আছে।`,
    },
    {
      question: `${vars.district}-এ ${vars.specialty} ডাক্তারের অ্যাপয়েন্টমেন্ট কীভাবে নেব?`,
      answer: `প্রোফাইলের "অ্যাপয়েন্টমেন্ট অনুরোধ" বাটনে ট্যাপ করে নাম ও ফোন দিয়ে অনুরোধ পাঠান, অথবা সরাসরি কল/WhatsApp করুন।`,
    },
    {
      question: `${vars.district}-এ কতজন ${vars.specialty} ডাক্তার আছেন?`,
      answer: `বর্তমানে Vytanexa-এ ${vars.district}-এ ${toBengaliDigits(vars.doctor_count)} জন ${vars.specialty} বিশেষজ্ঞ তালিকাভুক্ত।`,
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
