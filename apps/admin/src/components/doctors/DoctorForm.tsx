'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ChamberEditor, type ChamberFormValue } from './ChamberEditor';
import { doctorSlugBase } from '@/lib/doctor-utils';
import { slugify } from '@/lib/location-utils';

type DoctorInitial = {
  id?: string;
  name_translations: { bn?: string; en?: string; hi?: string } | null;
  slug: string;
  photo_url: string | null;
  category_id: string;
  degree: string[];
  bmdc_registration_no: string | null;
  experience_years: number;
  bio_translations: { bn?: string; en?: string; hi?: string } | null;
  expertise_tags: string[];
  treats_conditions: string[];
  languages: string[];
  search_aliases: string[];
  consultation_fee_min: number | null;
  consultation_fee_max: number | null;
  whatsapp_number: string | null;
  verification_status: string;
  is_available: boolean;
  is_featured: boolean;
  featured_priority: number;
  chambers?: ChamberFormValue[];
};

type Props = {
  mode: 'create' | 'edit';
  initial?: DoctorInitial | null;
  categories: { id: string; name_translations: { bn?: string; en?: string } | null; slug: string }[];
  locations: import('@/lib/location-hierarchy').LocationNode[];
};

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-admin-border bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-admin-h3 text-neutral-900">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-neutral-500" /> : <ChevronRight className="h-4 w-4 text-neutral-500" />}
      </button>
      {open && <div className="border-t border-admin-border px-4 py-4">{children}</div>}
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (!t) return;
    if (value.includes(t)) { setInput(''); return; }
    onChange([...value, t]);
    setInput('');
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-admin-small text-neutral-700">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== tag))} className="ml-1 text-neutral-400 hover:text-neutral-700">✕</button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={placeholder ?? 'টাইপ করে Enter চাপুন'} className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        <button type="button" onClick={add} className="h-9 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50">+ যোগ করুন</button>
      </div>
    </div>
  );
}

export function DoctorForm({ mode, initial, categories, locations }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [nameBn, setNameBn] = useState(initial?.name_translations?.bn ?? '');
  const [nameEn, setNameEn] = useState(initial?.name_translations?.en ?? '');
  const [nameHi, setNameHi] = useState(initial?.name_translations?.hi ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '');
  const [degree, setDegree] = useState<string[]>(initial?.degree ?? []);
  const [bmdc, setBmdc] = useState(initial?.bmdc_registration_no ?? '');
  const [exp, setExp] = useState(String(initial?.experience_years ?? '0'));
  const [languages, setLanguages] = useState<string[]>(initial?.languages ?? ['bn']);
  const [bioBn, setBioBn] = useState((initial?.bio_translations as { bn?: string } | null)?.bn ?? '');
  const [bioEn, setBioEn] = useState((initial?.bio_translations as { en?: string } | null)?.en ?? '');
  const [bioHi, setBioHi] = useState((initial?.bio_translations as { hi?: string } | null)?.hi ?? '');
  const [expertise, setExpertise] = useState<string[]>(initial?.expertise_tags ?? []);
  const [treats, setTreats] = useState<string[]>(initial?.treats_conditions ?? []);
  const [aliases, setAliases] = useState<string[]>(initial?.search_aliases ?? []);
  const [wa, setWa] = useState(initial?.whatsapp_number ?? '');
  const [feeMin, setFeeMin] = useState(initial?.consultation_fee_min != null ? String(initial.consultation_fee_min) : '');
  const [feeMax, setFeeMax] = useState(initial?.consultation_fee_max != null ? String(initial.consultation_fee_max) : '');
  const [verification, setVerification] = useState(initial?.verification_status ?? 'pending');
  const [isAvailable, setIsAvailable] = useState(initial?.is_available ?? true);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [featuredPriority, setFeaturedPriority] = useState(String(initial?.featured_priority ?? '0'));
  const [chambers, setChambers] = useState<ChamberFormValue[]>(initial?.chambers ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // auto slug
  useEffect(() => {
    if (slugTouched) return;
    const next = doctorSlugBase(nameBn, nameEn);
    if (next) setSlug(next);
  }, [nameBn, nameEn, slugTouched]);

  const handleSubmit = async (publish: boolean) => {
    setBusy(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name_translations: { bn: nameBn.trim(), en: nameEn.trim(), hi: nameHi.trim() },
      slug: slug.trim() ? slugify(slug.trim()) : undefined,
      photo_url: photoUrl.trim() || undefined,
      category_id: categoryId,
      degree,
      bmdc_registration_no: bmdc.trim() || undefined,
      experience_years: Number(exp) || 0,
      bio_translations: { bn: bioBn.trim(), en: bioEn.trim(), hi: bioHi.trim() },
      expertise_tags: expertise,
      treats_conditions: treats,
      languages,
      search_aliases: aliases,
      consultation_fee_min: feeMin === '' ? null : Number(feeMin),
      consultation_fee_max: feeMax === '' ? null : Number(feeMax),
      whatsapp_number: wa.trim() || undefined,
      verification_status: publish ? (verification as string) : (initial?.verification_status ?? verification),
      is_available: isAvailable,
      is_featured: isFeatured,
      featured_priority: Number(featuredPriority) || 0,
      chambers: chambers.map((c, idx) => ({
        ...(c.id ? { id: c.id } : {}),
        chamber_name: c.chamber_name,
        location_id: c.location_id,
        address_line: c.address_line,
        phone: c.phone,
        whatsapp_number: c.whatsapp_number || undefined,
        map_link: c.map_link || undefined,
        latitude: c.latitude === '' ? null : Number(c.latitude),
        longitude: c.longitude === '' ? null : Number(c.longitude),
        consultation_fee: c.consultation_fee === '' ? null : Number(c.consultation_fee),
        schedule: c.schedule,
        is_primary: c.is_primary,
        display_order: idx,
        is_active: c.is_active,
      })),
    };

    // if edit and not publish, keep existing verification unless user changed it explicitly
    // For create, pending is fine regardless of publish flag (both save same row)

    const url = mode === 'create' ? '/api/admin/doctors' : `/api/admin/doctors/${initial?.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setError(data?.error ?? 'সংরক্ষণ করা যায়নি');
      return;
    }
    toast.push('সংরক্ষিত হয়েছে ✅', 'success');
    router.push('/doctors');
    router.refresh();
  };

  const toggleLang = (lang: string) => {
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      {error && <div className="rounded-lg border border-emergency-200 bg-emergency-50 px-4 py-3 text-admin-body text-emergency-700">{error}</div>}

      <Section title="▾ মৌলিক তথ্য" defaultOpen>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">ছবি URL</span>
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            <span className="text-admin-small text-neutral-400">1:1 crop — MediaUploader future scope, আপাতত URL দিন</span>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">নাম (বাংলা) *</span>
              <input value={nameBn} onChange={(e) => setNameBn(e.target.value)} required placeholder="ডা. প্রিয়াঙ্কা দাস" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">Name (English)</span>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Dr. Priyanka Das" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">नाम (हिन्दी)</span>
              <input value={nameHi} onChange={(e) => setNameHi(e.target.value)} placeholder="हिन्दी नाम" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">স্লাগ (URL)</span>
            <div className="flex gap-2">
              <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="auto-generated" className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              <button type="button" onClick={() => { const n = doctorSlugBase(nameBn, nameEn); if (n) setSlug(n); setSlugTouched(false); }} className="h-9 rounded-md border border-admin-border px-3 text-admin-small font-medium text-neutral-600 hover:bg-neutral-50">পুনরায় তৈরি</button>
            </div>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">বিভাগ *</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                <option value="">বিভাগ নির্বাচন করুন</option>
                {categories.map((c) => {
                  const t = c.name_translations as { bn?: string; en?: string } | null;
                  return <option key={c.id} value={c.id}>{(t?.bn || t?.en || c.slug) as string}</option>;
                })}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">BMDC নম্বর</span>
              <input value={bmdc} onChange={(e) => setBmdc(e.target.value)} placeholder="A-12345" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">অভিজ্ঞতা (বছর)</span>
              <input value={exp} onChange={(e) => setExp(e.target.value)} inputMode="numeric" placeholder="10" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
          </div>

          <div>
            <p className="text-admin-small font-medium text-neutral-700">ডিগ্রি (একাধিক)</p>
            <div className="mt-1">
              <TagInput value={degree} onChange={setDegree} placeholder="MBBS, MD (Medicine)" />
            </div>
          </div>

          <div>
            <p className="text-admin-small font-medium text-neutral-700">ভাষা</p>
            <div className="mt-1 flex gap-2">
              {(['bn', 'en', 'hi'] as const).map((l) => (
                <label key={l} className={`flex items-center gap-1 rounded-md border px-3 py-1 text-admin-small ${languages.includes(l) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-admin-border bg-white text-neutral-600'}`}>
                  <input type="checkbox" checked={languages.includes(l)} onChange={() => toggleLang(l)} className="h-3.5 w-3.5" />
                  {l === 'bn' ? 'বাংলা' : l === 'en' ? 'English' : 'हिन्दी'}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="▸ পরিচিতি ও বিশেষজ্ঞতা" defaultOpen={false}>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">বায়ো (বাংলা)</span>
            <textarea value={bioBn} onChange={(e) => setBioBn(e.target.value)} rows={3} placeholder="সংক্ষিপ্ত পরিচিতি" className="rounded-md border border-admin-border px-3 py-2 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">Bio (English)</span>
            <textarea value={bioEn} onChange={(e) => setBioEn(e.target.value)} rows={3} placeholder="Short bio" className="rounded-md border border-admin-border px-3 py-2 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          <div>
            <p className="text-admin-small font-medium text-neutral-700">Expertise tags</p>
            <TagInput value={expertise} onChange={setExpertise} placeholder="Diabetes, Thyroid" />
          </div>
          <div>
            <p className="text-admin-small font-medium text-neutral-700">Treats conditions</p>
            <TagInput value={treats} onChange={setTreats} placeholder="জ্বর, ডায়াবেটিস" />
          </div>
        </div>
      </Section>

      <Section title="▸ যোগাযোগ ও ফি" defaultOpen={false}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">WhatsApp নম্বর</span>
            <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="98xxxxxxxx" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">ফি সর্বনিম্ন</span>
            <input value={feeMin} onChange={(e) => setFeeMin(e.target.value)} inputMode="decimal" placeholder="300" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">ফি সর্বোচ্চ</span>
            <input value={feeMax} onChange={(e) => setFeeMax(e.target.value)} inputMode="decimal" placeholder="800" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
        </div>
      </Section>

      <Section title="▸ সার্চ সেটিংস" defaultOpen={false}>
        <div>
          <p className="text-admin-small font-medium text-neutral-700">Search aliases — এই ডাক্তারকে অন্য কোন নামে মানুষ খুঁজতে পারে?</p>
          <p className="text-admin-small text-neutral-400">যেমন: ডাকনাম, বানান ভ্যারিয়েন্ট</p>
          <div className="mt-2">
            <TagInput value={aliases} onChange={setAliases} placeholder="priyanka, পিয়াঙ্কা" />
          </div>
        </div>
      </Section>

      <Section title={`▾ চেম্বার (${chambers.length}টি)`} defaultOpen>
        <ChamberEditor chambers={chambers} onChange={setChambers} locations={locations} />
      </Section>

      <Section title="▾ স্ট্যাটাস" defaultOpen>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">ভেরিফিকেশন</span>
            <select value={verification} onChange={(e) => setVerification(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
              <option value="pending">🟡 পেন্ডিং</option>
              <option value="verified">✅ ভেরিফাইড</option>
              <option value="rejected">❌ প্রত্যাখ্যাত</option>
              <option value="suspended">🚫 সাসপেন্ডেড</option>
            </select>
            <span className="text-admin-small text-neutral-400">ভেরিফাইড হলে পাবলিক অ্যাপে দেখা যাবে</span>
          </label>

          <label className="flex items-center gap-2 text-admin-body text-neutral-700">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="h-4 w-4 rounded border-admin-border" />
            সক্রিয় (is_available — অ্যাপে দেখাবে)
          </label>

          <label className="flex items-center gap-2 text-admin-body text-neutral-700">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded border-admin-border" />
            ফিচার্ড
          </label>

          {isFeatured && (
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">ফিচার প্রায়োরিটি</span>
              <input value={featuredPriority} onChange={(e) => setFeaturedPriority(e.target.value)} inputMode="numeric" placeholder="0" className="h-9 w-32 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
          )}
        </div>
      </Section>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => handleSubmit(false)} disabled={busy || !nameBn.trim() || !categoryId} className="h-10 rounded-md border border-admin-border bg-white px-5 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
          {busy ? 'সংরক্ষণ হচ্ছে...' : 'খসড়া হিসেবে সংরক্ষণ'}
        </button>
        <button type="button" onClick={() => handleSubmit(true)} disabled={busy || !nameBn.trim() || !categoryId} className="h-10 rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ ও প্রকাশ করুন'}
        </button>
      </div>
    </form>
  );
}
