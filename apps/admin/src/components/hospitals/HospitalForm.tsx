'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { hospitalSlugBase, FACILITY_OPTIONS } from '@/lib/hospital-utils';
import { slugify } from '@/lib/location-utils';

type Initial = {
  id?: string;
  name_translations: { bn?: string; en?: string; hi?: string } | null;
  slug: string;
  type: string;
  cover_image_url: string | null;
  gallery_images: string[];
  location_id: string;
  address_line: string;
  latitude: number | null;
  longitude: number | null;
  map_link: string | null;
  phone: string;
  whatsapp_number: string | null;
  description_translations: { bn?: string; en?: string; hi?: string } | null;
  services: string[];
  facility_tags: string[];
  has_emergency_dept: boolean;
  operating_hours: { is_24x7?: boolean; schedule?: { day: string; open: string; close: string }[] } | null;
  verification_status: string;
  is_featured: boolean;
  is_trending: boolean;
  featured_priority: number;
};

type Props = {
  mode: 'create' | 'edit';
  initial?: Initial | null;
  locations: { id: string; name_translations: { bn?: string; en?: string } | null; slug: string }[];
  testCatalog: { canonical_key: string; name_translations: { bn?: string; en?: string } | null }[];
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

export function HospitalForm({ mode, initial, locations, testCatalog }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [nameBn, setNameBn] = useState(initial?.name_translations?.bn ?? '');
  const [nameEn, setNameEn] = useState(initial?.name_translations?.en ?? '');
  const [nameHi, setNameHi] = useState(initial?.name_translations?.hi ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [type, setType] = useState(initial?.type ?? 'hospital');
  const [cover, setCover] = useState(initial?.cover_image_url ?? '');
  const [gallery, setGallery] = useState<string[]>(initial?.gallery_images ?? []);
  const [galleryInput, setGalleryInput] = useState('');
  const [locationId, setLocationId] = useState(initial?.location_id ?? '');
  const [address, setAddress] = useState(initial?.address_line ?? '');
  const [lat, setLat] = useState(initial?.latitude != null ? String(initial.latitude) : '');
  const [lng, setLng] = useState(initial?.longitude != null ? String(initial.longitude) : '');
  const [mapLink, setMapLink] = useState(initial?.map_link ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [wa, setWa] = useState(initial?.whatsapp_number ?? '');
  const [descBn, setDescBn] = useState((initial?.description_translations as { bn?: string } | null)?.bn ?? '');
  const [descEn, setDescEn] = useState((initial?.description_translations as { en?: string } | null)?.en ?? '');
  const [services, setServices] = useState<string[]>(initial?.services ?? []);
  const [serviceSearch, setServiceSearch] = useState('');
  const [facility, setFacility] = useState<string[]>(initial?.facility_tags ?? []);
  const [hasEmergency, setHasEmergency] = useState(initial?.has_emergency_dept ?? false);
  const [is24x7, setIs24x7] = useState((initial?.operating_hours as { is_24x7?: boolean } | null)?.is_24x7 ?? false);
  const [schedule, setSchedule] = useState<{ day: string; open: string; close: string }[]>((initial?.operating_hours as { schedule?: { day: string; open: string; close: string }[] } | null)?.schedule ?? []);
  const [verification, setVerification] = useState(initial?.verification_status ?? 'pending');
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [isTrending, setIsTrending] = useState(initial?.is_trending ?? false);
  const [priority, setPriority] = useState(String(initial?.featured_priority ?? '0'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // test catalog add inline
  const [newTestKey, setNewTestKey] = useState('');
  const [newTestBn, setNewTestBn] = useState('');

  useEffect(() => {
    if (slugTouched) return;
    const next = hospitalSlugBase(nameBn, nameEn);
    if (next) setSlug(next);
  }, [nameBn, nameEn, slugTouched]);

  const filteredTests = serviceSearch.trim()
    ? testCatalog.filter((t) => {
        const q = serviceSearch.toLowerCase();
        const nt = t.name_translations as { bn?: string; en?: string } | null;
        return t.canonical_key.toLowerCase().includes(q) || (nt?.bn ?? '').toLowerCase().includes(q) || (nt?.en ?? '').toLowerCase().includes(q);
      }).slice(0, 20)
    : [];

  const toggleService = (key: string) => setServices((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const toggleFacility = (key: string) => setFacility((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const addGallery = () => {
    const url = galleryInput.trim();
    if (!url || gallery.length >= 8) return;
    setGallery([...gallery, url]);
    setGalleryInput('');
  };

  const handleAddTestCatalog = async () => {
    if (!newTestKey.trim() || !newTestBn.trim()) { setError('canonical_key ও বাংলা নাম দিন'); return; }
    const res = await fetch('/api/admin/test-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canonical_key: newTestKey.trim(), name_translations: { bn: newTestBn.trim(), en: '', hi: '' }, aliases: [], category: '' }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      setError(d?.error ?? 'ক্যাটালগে যোগ করা যায়নি');
      return;
    }
    toast.push('টেস্ট ক্যাটালগে যোগ হয়েছে ✅', 'success');
    setNewTestKey(''); setNewTestBn('');
    // add to services directly
    setServices((prev) => [...prev, newTestKey.trim()]);
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      name_translations: { bn: nameBn.trim(), en: nameEn.trim(), hi: nameHi.trim() },
      slug: slug.trim() ? slugify(slug.trim()) : undefined,
      type,
      cover_image_url: cover.trim() || undefined,
      gallery_images: gallery,
      location_id: locationId,
      address_line: address.trim(),
      latitude: lat === '' ? null : Number(lat),
      longitude: lng === '' ? null : Number(lng),
      map_link: mapLink.trim() || undefined,
      phone: phone.trim(),
      whatsapp_number: wa.trim() || undefined,
      description_translations: { bn: descBn.trim(), en: descEn.trim(), hi: '' },
      services,
      facility_tags: facility,
      has_emergency_dept: hasEmergency,
      operating_hours: { is_24x7: is24x7, schedule: is24x7 ? [] : schedule },
      verification_status: verification,
      is_featured: isFeatured,
      is_trending: isTrending,
      featured_priority: Number(priority) || 0,
    };

    const url = mode === 'create' ? '/api/admin/hospitals' : `/api/admin/hospitals/${initial?.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      setError(d?.error ?? 'সংরক্ষণ করা যায়নি');
      return;
    }
    toast.push('সংরক্ষিত হয়েছে ✅', 'success');
    router.push('/hospitals');
    router.refresh();
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      {error && <div className="rounded-lg border border-emergency-200 bg-emergency-50 px-4 py-3 text-admin-body text-emergency-700">{error}</div>}

      <Section title="▾ মৌলিক তথ্য" defaultOpen>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">কভার ছবি URL (16:9)</span>
            <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">গ্যালারি (8টি পর্যন্ত) — URL যোগ করুন</span>
            <div className="flex gap-2">
              <input value={galleryInput} onChange={(e) => setGalleryInput(e.target.value)} placeholder="https://.../img.jpg" className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              <button type="button" onClick={addGallery} disabled={gallery.length >= 8} className="h-9 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-30">+ যোগ</button>
            </div>
            {gallery.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {gallery.map((url, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-admin-small text-neutral-700">
                    {url.slice(0, 24)}…
                    <button type="button" onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))} className="text-neutral-400 hover:text-neutral-700">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">নাম (বাংলা) *</span>
              <input value={nameBn} onChange={(e) => setNameBn(e.target.value)} required placeholder="কোচবিহার জেলা হাসপাতাল" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">Name (English)</span>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Cooch Behar Hospital" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">नाम (हिन्दी)</span>
              <input value={nameHi} onChange={(e) => setNameHi(e.target.value)} placeholder="हिन्दी" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">স্লাগ</span>
            <div className="flex gap-2">
              <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="auto" className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              <button type="button" onClick={() => { const n = hospitalSlugBase(nameBn, nameEn); if (n) setSlug(n); setSlugTouched(false); }} className="h-9 rounded-md border border-admin-border px-3 text-admin-small font-medium text-neutral-600 hover:bg-neutral-50">পুনরায় তৈরি</button>
            </div>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">ধরন *</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                <option value="hospital">হাসপাতাল</option>
                <option value="clinic">ক্লিনিক</option>
                <option value="diagnostic">ডায়াগনস্টিক</option>
                <option value="nursing_home">নার্সিং হোম</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">এলাকা *</span>
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                <option value="">এলাকা নির্বাচন করুন</option>
                {locations.map((l) => {
                  const t = l.name_translations as { bn?: string; en?: string } | null;
                  return <option key={l.id} value={l.id}>{(t?.bn || t?.en || l.slug) as string}</option>;
                })}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-admin-small font-medium text-neutral-700">ঠিকানা *</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="ঠিকানা" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ফোন *</span><input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="98xxxxxxxx" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">WhatsApp</span><input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="98xxxxxxxx" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">Maps লিংক</span><input value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="https://maps..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">অক্ষাংশ</span><input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="22.57" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">দ্রাঘিমাংশ</span><input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="88.36" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          </div>
        </div>
      </Section>

      <Section title="▸ বিবরণ" defaultOpen={false}>
        <div className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">বিবরণ (বাংলা)</span><textarea value={descBn} onChange={(e) => setDescBn(e.target.value)} rows={3} placeholder="হাসপাতাল সম্পর্কে" className="rounded-md border border-admin-border px-3 py-2 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">Description (English)</span><textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} placeholder="About hospital" className="rounded-md border border-admin-border px-3 py-2 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
        </div>
      </Section>

      <Section title="▾ সেবা ও সুবিধা" defaultOpen>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-admin-small font-medium text-neutral-700">পরীক্ষা/সেবা (Test Catalog থেকে বেছে নিন)</p>
            <div className="mt-1 flex gap-2">
              <input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="🔍 টেস্ট খুঁজুন... (যেমন: CBC, X-Ray)" className="h-9 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </div>
            {serviceSearch && filteredTests.length > 0 && (
              <div className="mt-2 rounded-md border border-admin-border bg-white p-2">
                {filteredTests.map((t) => {
                  const nt = t.name_translations as { bn?: string; en?: string } | null;
                  const label = (nt?.bn || nt?.en || t.canonical_key) as string;
                  const active = services.includes(t.canonical_key);
                  return (
                    <button key={t.canonical_key} type="button" onClick={() => toggleService(t.canonical_key)} className={`mr-1 mt-1 rounded-full border px-2 py-1 text-admin-small ${active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-admin-border bg-white text-neutral-600 hover:bg-neutral-50'}`}>{active ? '✓' : '+'}{label} ({t.canonical_key})</button>
                  );
                })}
              </div>
            )}
            {services.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {services.map((s) => <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-admin-small text-brand-700">{s}<button type="button" onClick={() => toggleService(s)} className="text-brand-400 hover:text-brand-700">✕</button></span>)}
              </div>
            )}
            <div className="mt-3 rounded-md border border-dashed border-admin-border bg-neutral-50 p-3">
              <p className="text-admin-small font-medium text-neutral-700">ক্যাটালগে নেই? নতুন টেস্ট যোগ করুন</p>
              <div className="mt-1 flex gap-2">
                <input value={newTestKey} onChange={(e) => setNewTestKey(e.target.value)} placeholder="canonical_key (e.g. usg_abdomen)" className="h-8 flex-1 rounded-md border border-admin-border px-2 text-admin-small" />
                <input value={newTestBn} onChange={(e) => setNewTestBn(e.target.value)} placeholder="বাংলা নাম" className="h-8 flex-1 rounded-md border border-admin-border px-2 text-admin-small" />
                <button type="button" onClick={handleAddTestCatalog} className="h-8 rounded-md border border-admin-border bg-white px-3 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50">+ যোগ</button>
              </div>
            </div>
          </div>

          <div>
            <p className="text-admin-small font-medium text-neutral-700">সুবিধা ট্যাগ</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {FACILITY_OPTIONS.map((f) => (
                <button key={f.key} type="button" onClick={() => toggleFacility(f.key)} className={`rounded-full border px-3 py-1 text-admin-small ${facility.includes(f.key) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-admin-border bg-white text-neutral-600 hover:bg-neutral-50'}`}>{facility.includes(f.key) ? '✓' : ''}{f.bn}</button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={hasEmergency} onChange={(e) => setHasEmergency(e.target.checked)} className="h-4 w-4 rounded border-admin-border" /> ☑ জরুরি বিভাগ আছে (has_emergency_dept) — টিক দিলে /emergency-তে দেখাবে</label>
        </div>
      </Section>

      <Section title="▾ সময়" defaultOpen={false}>
        <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={is24x7} onChange={(e) => setIs24x7(e.target.checked)} className="h-4 w-4 rounded border-admin-border" /> ☑ ২৪ ঘণ্টা খোলা</label>
        {!is24x7 && (
          <div className="mt-3">
            <p className="text-admin-small font-medium text-neutral-700">সময়সূচি</p>
            <div className="mt-2 flex flex-col gap-2">
              {schedule.map((row, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 rounded-md border border-admin-border bg-white px-2 py-2">
                  <select value={row.day} onChange={(e) => { const n = [...schedule]; n[idx] = { ...row, day: e.target.value }; setSchedule(n); }} className="h-7 rounded border border-admin-border bg-white px-1 text-[12px]">
                    <option value="sat">শনি</option><option value="sun">রবি</option><option value="mon">সোম</option><option value="tue">মঙ্গল</option><option value="wed">বুধ</option><option value="thu">বৃহঃ</option><option value="fri">শুক্র</option>
                  </select>
                  <input type="time" value={row.open} onChange={(e) => { const n = [...schedule]; n[idx] = { ...row, open: e.target.value }; setSchedule(n); }} className="h-7 rounded border border-admin-border px-1 text-[12px]" />
                  <span className="text-admin-small text-neutral-400">—</span>
                  <input type="time" value={row.close} onChange={(e) => { const n = [...schedule]; n[idx] = { ...row, close: e.target.value }; setSchedule(n); }} className="h-7 rounded border border-admin-border px-1 text-[12px]" />
                  <button type="button" onClick={() => setSchedule(schedule.filter((_, i) => i !== idx))} className="ml-auto text-admin-small text-emergency-600">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setSchedule([...schedule, { day: 'sat', open: '09:00', close: '21:00' }])} className="self-start rounded-md border border-admin-border bg-white px-3 py-1 text-admin-small text-neutral-600 hover:bg-neutral-50">+ সময় যোগ করুন</button>
            </div>
          </div>
        )}
      </Section>

      <Section title="▾ স্ট্যাটাস" defaultOpen>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ভেরিফিকেশন</span>
            <select value={verification} onChange={(e) => setVerification(e.target.value)} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
              <option value="pending">🟡 পেন্ডিং</option><option value="verified">✅ ভেরিফাইড</option><option value="rejected">❌ প্রত্যাখ্যাত</option><option value="suspended">🚫 সাসপেন্ডেড</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded border-admin-border" /> ফিচার্ড</label>
          <label className="flex items-center gap-2 text-admin-body text-neutral-700"><input type="checkbox" checked={isTrending} onChange={(e) => setIsTrending(e.target.checked)} className="h-4 w-4 rounded border-admin-border" /> ট্রেন্ডিং</label>
          {(isFeatured || isTrending) && (
            <label className="flex flex-col gap-1"><span className="text-admin-small font-medium text-neutral-700">ফিচার প্রায়োরিটি</span><input value={priority} onChange={(e) => setPriority(e.target.value)} inputMode="numeric" placeholder="0" className="h-9 w-32 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
          )}
        </div>
      </Section>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={handleSubmit} disabled={busy || !nameBn.trim() || !locationId || !address.trim() || !phone.trim()} className="h-10 rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</button>
      </div>
    </form>
  );
}
