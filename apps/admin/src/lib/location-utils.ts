/**
 * Location helpers — shared between the Locations Manager client UI and
 * its server Route Handlers, so slug generation is IDENTICAL on both
 * sides (the client pre-fills the slug while the admin types; the server
 * re-derives it during CSV bulk import — they must never disagree).
 *
 * No `server-only` import here on purpose: `slugify`/`transliterate`
 * are pure string functions safe for the browser bundle.
 *
 * ADMIN-PANEL-SPEC.md § A04 "Locations Manager":
 *   "Slug auto-generated from Bengali/English name (transliterated,
 *   lowercase, hyphenated) but editable — matters because slugs feed
 *   directly into the SEO landing page URLs (S21)."
 */
import type { Database } from '@vytanexa/database';

export type LocationType = Database['public']['Enums']['location_type'];
// 'state' | 'district' | 'sub_district' | 'ward'

/** Ordered levels (shallow → deep) for tree building + "next level" help. */
export const LOCATION_LEVELS: LocationType[] = ['state', 'district', 'sub_district', 'ward'];

/** Bengali label for each level, used in the tree rows + modal type field. */
export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  state: 'State (রাজ্য)',
  district: 'District (জেলা)',
  sub_district: 'উপজেলা / মহকুমা',
  ward: 'Ward (এলাকা)',
};

/** The level one notch deeper than `type`, or null for the deepest. */
export function childType(type: LocationType): LocationType | null {
  const i = LOCATION_LEVELS.indexOf(type);
  return i >= 0 && i < LOCATION_LEVELS.length - 1 ? (LOCATION_LEVELS[i + 1] as LocationType) : null;
}

// ---------------------------------------------------------------------------
// Bengali → Latin transliteration (simplified, no diacritics — good enough
// for URL slugs, NOT a linguistically rigorous romanization).
// ---------------------------------------------------------------------------

const BN_TO_LATIN: Record<string, string> = {
  // Vowels (independent)
  অ: 'a', আ: 'a', ই: 'i', ঈ: 'i', উ: 'u', ঊ: 'u', ঋ: 'ri',
  এ: 'e', ঐ: 'oi', ও: 'o', ঔ: 'ou',
  // Vowel signs (mātrā) — attach to preceding consonant
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
  'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
  // Consonants
  ক: 'k', খ: 'kh', গ: 'g', ঘ: 'gh', ঙ: 'ng',
  চ: 'ch', ছ: 'chh', জ: 'j', ঝ: 'jh', ঞ: 'n',
  ট: 't', ঠ: 'th', ড: 'd', ঢ: 'dh', ণ: 'n',
  ত: 't', থ: 'th', দ: 'd', ধ: 'dh', ন: 'n',
  প: 'p', ফ: 'ph', ব: 'b', ভ: 'bh', ম: 'm',
  য: 'j', র: 'r', ল: 'l', শ: 'sh', ষ: 'sh', স: 's', হ: 'h',
  ড়: 'r', ঢ়: 'rh', য়: 'y',
  // Diacritics / special
  'ং': 'ng', 'ঃ': 'h', 'ৎ': 't',
  // Digits
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

function transliterate(input: string): string {
  let out = '';
  // Iterate by code point so surrogate pairs / combining marks survive —
  // Bengali is BMP but this is safer and order-independent.
  for (const ch of input) {
    if (BN_TO_LATIN[ch]) out += BN_TO_LATIN[ch];
    else if (/[a-zA-Z0-9]/.test(ch)) out += ch; // preserve any existing Latin
    else if (/\s/.test(ch)) out += ' ';
    // Other symbols / punctuation / zero-width joining marks are dropped.
  }
  return out;
}

/**
 * Slugify a name for URL use: transliterate Bengali → Latin, lowercase,
 * collapse runs of non-alphanumeric into single hyphens, trim edges.
 * Returns '' if there is nothing usable (caller then falls back to en).
 */
export function slugify(input: string): string {
  const latin = transliterate(input);
  const slug = latin
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug;
}

/** Auto-slug from bn name, falling back to en name, falling back to ''. */
export function autoSlug(nameBn: string, nameEn: string): string {
  return (nameBn && slugify(nameBn)) || (nameEn && slugify(nameEn)) || '';
}

// ---------------------------------------------------------------------------
// Tree building (flat rows → nested) + flattening helpers for the editor.
// ---------------------------------------------------------------------------

export type AdminLocation = {
  id: string;
  parent_id: string | null;
  type: LocationType;
  name_translations: { bn?: string; en?: string; hi?: string } | null;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  display_order: number;
  is_active: boolean;
  children?: AdminLocation[]; // populated by buildLocationTree
};

export function buildLocationTree(rows: AdminLocation[]): AdminLocation[] {
  const byParent = new Map<string | null, AdminLocation[]>();
  for (const row of rows) {
    const key = row.parent_id;
    const list = byParent.get(key) ?? [];
    list.push(row);
    byParent.set(key, list);
  }
  const sort = (a: AdminLocation, b: AdminLocation) =>
    a.display_order - b.display_order || a.slug.localeCompare(b.slug);
  const attach = (node: AdminLocation) => {
    const kids = (byParent.get(node.id) ?? []).sort(sort).map((k) => attach(k));
    if (kids.length) node.children = kids;
    return node;
  };
  return (byParent.get(null) ?? []).sort(sort).map(attach);
}

/** Depth-first flatten with each node's depth, for the search-filter path. */
export function flattenTree(
  nodes: AdminLocation[],
  depth = 0
): { node: AdminLocation; depth: number }[] {
  const out: { node: AdminLocation; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children) out.push(...flattenTree(n.children, depth + 1));
  }
  return out;
}

/** Bengali display name (bn → en → hi → slug fallback). */
export function locationName(loc: { name_translations: AdminLocation['name_translations']; slug: string }): string {
  const t = loc.name_translations;
  return (t?.bn && t.bn.trim()) || (t?.en && t.en.trim()) || loc.slug;
}