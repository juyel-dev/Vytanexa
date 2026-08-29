/**
 * Category icon picker — small curated SVG set (A04).
 * `icon_key` stored in DB maps to a lucide-ish emoji here for the admin
 * panel preview. The user app's CategoryGrid renders the same key with its
 * own SVG set — keeping the key, not the asset, as the contract.
 */
export const CATEGORY_ICONS: { key: string; label: string; emoji: string }[] = [
  { key: 'heart', label: 'হৃদরোগ', emoji: '🫀' },
  { key: 'brain', label: 'নিউরো', emoji: '🧠' },
  { key: 'bone', label: 'অস্থি', emoji: '🦴' },
  { key: 'eye', label: 'চক্ষু', emoji: '👁️' },
  { key: 'baby', label: 'শিশু', emoji: '👶' },
  { key: 'women', label: 'গাইনী', emoji: '🤰' },
  { key: 'skin', label: 'চর্ম', emoji: '🧴' },
  { key: 'kidney', label: 'কিডনি', emoji: '🫘' },
  { key: 'lungs', label: 'ফুসফুস', emoji: '🫁' },
  { key: 'tooth', label: 'দন্ত', emoji: '🦷' },
  { key: 'ear', label: 'নাক-কান-গলা', emoji: '👂' },
  { key: 'stethoscope', label: 'মেডিসিন', emoji: '🩺' },
  { key: 'surgery', label: 'সার্জারি', emoji: '🔪' },
  { key: 'cancer', label: 'ক্যান্সার', emoji: '🎗️' },
  { key: 'diabetes', label: 'ডায়াবেটিস', emoji: '💉' },
  { key: 'mental', label: 'মানসিক', emoji: '🧘' },
  { key: 'physio', label: 'ফিজিও', emoji: '🏃' },
  { key: 'general', label: 'সাধারণ', emoji: '🏷️' },
];

export function iconEmoji(iconKey: string | null): string {
  return CATEGORY_ICONS.find((i) => i.key === iconKey)?.emoji ?? '🏷️';
}

export function categoryName(cat: { name_translations: { bn?: string; en?: string } | null; slug: string }): string {
  const t = cat.name_translations as { bn?: string; en?: string } | null;
  return (t?.bn && t.bn.trim()) || (t?.en && t.en.trim()) || cat.slug;
}
