'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n';
import type { SymptomListItem } from '@/lib/queries/symptom-list';

/**
 * Symptoms List — VYTANEXA-BLUEPRINT.md § S09 "Symptoms List Page".
 * Emergency section always pinned top, general grid grouped (see
 * `lib/queries/symptom-list.ts` for the schema-gap note on grouping
 * by first linked specialty instead of a nonexistent symptom-category
 * field), search filters client-side across the full preloaded set —
 * "dataset small enough to be SSG'd entirely, no server round-trip
 * needed".
 */
export function SymptomsListClient({ symptoms }: { symptoms: SymptomListItem[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return symptoms;
    return symptoms.filter((s) =>
      getLocalizedField(s.title_translations).toLowerCase().includes(q)
    );
  }, [symptoms, query]);

  const emergency = filtered.filter((s) => s.is_emergency);
  const general = filtered.filter((s) => !s.is_emergency);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: SymptomListItem[] }>();
    for (const s of general) {
      const firstLink = [...s.symptom_categories].sort(
        (a, b) => a.display_order - b.display_order
      )[0];
      const key = firstLink?.categories?.id ?? 'other';
      const label = firstLink?.categories
        ? getLocalizedField(firstLink.categories.name_translations)
        : 'অন্যান্য';
      const group = map.get(key) ?? { label, items: [] };
      group.items.push(s);
      map.set(key, group);
    }
    return [...map.values()];
  }, [general]);

  return (
    <div className="pb-6">
      <div className="px-4 py-3">
        <div className="flex h-11 items-center gap-2 rounded-full bg-neutral-100 px-4">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="উপসর্গ খুঁজুন..."
            className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      {emergency.length > 0 && (
        <section className="mb-2 bg-emergency-50 px-4 py-4">
          <h2 className="mb-3 text-[15px] font-bold text-emergency-700">🚨 জরুরি উপসর্গ</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {emergency.map((s) => (
              <SymptomCard key={s.id} symptom={s} />
            ))}
          </div>
        </section>
      )}

      {groups.map((group) => (
        <section key={group.label} className="px-4 py-4">
          <h2 className="mb-3 text-[15px] font-bold text-neutral-800">{group.label}</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {group.items.map((s) => (
              <SymptomCard key={s.id} symptom={s} />
            ))}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <p className="px-6 py-10 text-center text-[13px] text-neutral-400">
          কোনো উপসর্গ পাওয়া যায়নি
        </p>
      )}
    </div>
  );
}

function SymptomCard({ symptom }: { symptom: SymptomListItem }) {
  const title = getLocalizedField(symptom.title_translations);
  return (
    <Link
      href={`/symptoms/${symptom.slug}`}
      className={`relative block h-[110px] overflow-hidden rounded-lg bg-neutral-200 transition-transform active:scale-95 ${
        symptom.is_emergency ? 'ring-2 ring-emergency-600' : ''
      }`}
    >
      {symptom.cover_image_url && (
        <Image
          src={symptom.cover_image_url}
          alt={title}
          fill
          sizes="50vw"
          className="object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
      {symptom.is_emergency && <span className="absolute left-2 top-2 text-sm">🚨</span>}
      <span className="absolute bottom-2 left-2.5 right-2.5 text-[13px] font-semibold text-white">
        {title}
      </span>
    </Link>
  );
}
