'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Block = { type: string; [k: string]: unknown };
type Page = { id: string; slug: string; title: string; blocks: Block[]; is_published: boolean; show_in_menu: boolean; menu_icon: string | null; menu_order: number; meta_title: string | null; meta_description: string | null; og_image: string | null };

const BLOCK_LIBRARY: { type: string; label: string; emoji: string; desc: string; defaults: Block }[] = [
  { type: 'hero', label: 'Hero', emoji: '🖼️', desc: 'বড় ছবি ও শিরোনাম দিয়ে পেজ শুরু করুন', defaults: { type: 'hero', image: '', title: 'শিরোনাম', subtitle: '' } },
  { type: 'rich_text', label: 'Rich Text', emoji: '📝', desc: 'ফরম্যাটেড প্যারাগ্রাফ', defaults: { type: 'rich_text', content_html: '<p>এখানে লিখুন...</p>' } },
  { type: 'image', label: 'Image', emoji: '🖼️', desc: 'একটি ছবি, ঐচ্ছিক ক্যাপশন', defaults: { type: 'image', image: '', caption: '' } },
  { type: 'poll', label: 'Poll', emoji: '📊', desc: 'বিদ্যমান জরিপ এমবেড', defaults: { type: 'poll', poll_id: '' } },
  { type: 'qa_embed', label: 'Q&A', emoji: '🙋', desc: 'বিদ্যমান প্রশ্ন এমবেড', defaults: { type: 'qa_embed', question_id: '' } },
  { type: 'report_form', label: 'Form', emoji: '📋', desc: 'সাবমিশন ফর্ম', defaults: { type: 'report_form', title: 'ফর্ম', fields: [] } },
  { type: 'magazine_grid', label: 'Magazine', emoji: '📰', desc: 'আর্টিকেল গ্রিড', defaults: { type: 'magazine_grid', heading: 'আর্টিকেল', category: '' } },
  { type: 'doctor_grid', label: 'Doctor', emoji: '👨‍⚕️', desc: 'নির্বাচিত ডাক্তার', defaults: { type: 'doctor_grid', heading: 'ডাক্তার', doctor_ids: [] } },
  { type: 'hospital_grid', label: 'Hospital', emoji: '🏥', desc: 'নির্বাচিত হাসপাতাল', defaults: { type: 'hospital_grid', heading: 'হাসপাতাল', hospital_ids: [] } },
  { type: 'cta_banner', label: 'CTA', emoji: '📢', desc: 'ব্যানার + বাটন', defaults: { type: 'cta_banner', title: 'CTA', button_text: 'ক্লিক করুন', href: '/', color: 'brand' } },
  { type: 'faq_accordion', label: 'FAQ', emoji: '❓', desc: 'প্রশ্নোত্তর তালিকা', defaults: { type: 'faq_accordion', items: [{ question: 'প্রশ্ন', answer: 'উত্তর' }] } },
  { type: 'spacer', label: 'Spacer', emoji: '➖', desc: 'ফাঁকা স্থান', defaults: { type: 'spacer', size: 'medium' } },
];

export function PageBuilder({ initialPage, polls, questions, doctors, hospitals }: { initialPage: Page; polls: { id: string; question: string }[]; questions: { id: string; title: string }[]; doctors: { id: string; name_translations: { bn?: string } | null; slug: string }[]; hospitals: { id: string; name_translations: { bn?: string } | null; slug: string }[] }) {
  const toast = useToast();
  const [blocks, setBlocks] = useState<Block[]>(initialPage.blocks ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [title, setTitle] = useState(initialPage.title);
  const [slug, setSlug] = useState(initialPage.slug);
  const [isPublished, setIsPublished] = useState(initialPage.is_published);
  const [showInMenu, setShowInMenu] = useState(initialPage.show_in_menu);
  const [menuIcon, setMenuIcon] = useState(initialPage.menu_icon ?? '');
  const [metaTitle, setMetaTitle] = useState(initialPage.meta_title ?? '');
  const [metaDesc, setMetaDesc] = useState(initialPage.meta_description ?? '');
  const [ogImage, setOgImage] = useState(initialPage.og_image ?? '');
  const [saving, setSaving] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  // autosave every 30s
  useEffect(() => {
    const id = setInterval(async () => {
      setSaving(true);
      await fetch(`/api/admin/custom-pages/${initialPage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks, title, slug, show_in_menu: showInMenu, menu_icon: menuIcon || null, meta_title: metaTitle || null, meta_description: metaDesc || null, og_image: ogImage || null }),
      }).catch(() => null);
      setSaving(false);
    }, 30000);
    return () => clearInterval(id);
  }, [blocks, title, slug, showInMenu, menuIcon, metaTitle, metaDesc, ogImage, initialPage.id]);

  const addBlock = (type: string) => {
    const lib = BLOCK_LIBRARY.find((b) => b.type === type);
    if (!lib) return;
    setBlocks((prev) => [...prev, { ...lib.defaults }]);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= blocks.length) return;
    const next = [...blocks];
    const [m] = next.splice(idx, 1);
    if (!m) return;
    next.splice(ni, 0, m);
    setBlocks(next);
    setSelected(ni);
  };

  const updateBlock = (idx: number, patch: Record<string, unknown>) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const handlePublish = async () => {
    setBusy(true);
    const res = await fetch(`/api/admin/custom-pages/${initialPage.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks, title, slug, is_published: true, show_in_menu: showInMenu, menu_icon: menuIcon || null }),
    }).catch(() => null);
    setBusy(false);
    setPublishConfirm(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'প্রকাশ করা যায়নি', 'error');
      return;
    }
    setIsPublished(true);
    toast.push('✅ প্রকাশিত হয়েছে — vytanexa.app/page/' + slug, 'success');
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/custom-pages/${initialPage.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks, title, slug, show_in_menu: showInMenu, menu_icon: menuIcon || null, meta_title: metaTitle || null, meta_description: metaDesc || null, og_image: ogImage || null }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => null) : null;
      toast.push(d?.error ?? 'সংরক্ষণ করা যায়নি', 'error');
      return;
    }
    toast.push('খসড়া সংরক্ষিত হয়েছে ✅', 'success');
  };

  const selectedBlock = selected !== null ? blocks[selected] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-admin-h1 text-neutral-900">পেজ বিল্ডার: {title}</h1>
        <span className="text-admin-small text-neutral-400">{saving ? 'সংরক্ষণ হচ্ছে...' : 'স্বয়ংক্রিয় সংরক্ষণ ৩০সে'}</span>
        <a href={`/page/${slug}?preview=true`} target="_blank" rel="noopener noreferrer" className="h-9 rounded-md border border-admin-border bg-white px-3 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">👁️ প্রিভিউ</a>
        <button onClick={() => setPublishConfirm(true)} disabled={busy} className="h-9 rounded-md bg-brand-600 px-4 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{isPublished ? 'পুনরায় প্রকাশ' : 'প্রকাশ করুন'}</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[200px_1fr_300px]">
        {/* left: block library */}
        <div className="rounded-xl border border-admin-border bg-white p-3">
          <h3 className="text-admin-small font-medium text-neutral-700">ব্লক যোগ করুন</h3>
          <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {BLOCK_LIBRARY.map((b) => (
              <button key={b.type} onClick={() => addBlock(b.type)} title={b.desc} className="flex items-center gap-1.5 rounded-md border border-admin-border bg-white px-2 py-2 text-left text-admin-small hover:bg-neutral-50">
                <span>{b.emoji}</span>
                <span className="truncate font-medium text-neutral-700">{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* center: canvas */}
        <div className="rounded-xl border border-admin-border bg-neutral-50 p-3">
          <div className="flex flex-col gap-2">
            {blocks.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-admin-border bg-white px-4 py-10 text-center text-admin-body text-neutral-400">কোনো ব্লক নেই — বাম থেকে যোগ করুন</div>
            ) : (
              blocks.map((b, idx) => (
                <div key={idx} onClick={() => setSelected(idx)} className={`relative rounded-lg border bg-white p-3 ${selected === idx ? 'border-brand-600 ring-1 ring-brand-100' : 'border-admin-border'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-admin-small font-medium text-neutral-600">{BLOCK_LIBRARY.find((x) => x.type === b.type)?.emoji} {b.type}</span>
                    <span className="ml-auto flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); move(idx, -1); }} className="h-6 w-6 rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50">↑</button>
                      <button onClick={(e) => { e.stopPropagation(); move(idx, 1); }} className="h-6 w-6 rounded border border-admin-border bg-white text-neutral-500 hover:bg-neutral-50">↓</button>
                      <button onClick={(e) => { e.stopPropagation(); setBlocks(blocks.filter((_, i) => i !== idx)); setSelected(null); }} className="h-6 w-6 rounded border border-admin-border bg-white text-emergency-600 hover:bg-emergency-50">🗑️</button>
                    </span>
                  </div>
                  <div className="mt-2 text-admin-small text-neutral-600">
                    {/* mini preview */}
                    {b.type === 'hero' && <span>Hero: {(b.title as string) || 'শিরোনাম'} — {(b.subtitle as string) || ''}</span>}
                    {b.type === 'rich_text' && <span className="line-clamp-2">{String(b.content_html ?? '').slice(0, 80)}...</span>}
                    {b.type === 'image' && <span>Image: {(b.caption as string) || ''}</span>}
                    {b.type === 'spacer' && <span>Spacer: {b.size as string}</span>}
                    {b.type === 'cta_banner' && <span>CTA: {(b.title as string) || ''} → {(b.button_text as string) || ''}</span>}
                    {b.type === 'faq_accordion' && <span>FAQ: {((b.items as { question: string }[]) ?? []).length}টি প্রশ্ন</span>}
                    {['poll', 'qa_embed', 'report_form', 'magazine_grid', 'doctor_grid', 'hospital_grid'].includes(b.type as string) && <span>{b.type} block</span>}
                  </div>
                </div>
              ))
            )}
            {blocks.length > 0 && <button onClick={() => addBlock('rich_text')} className="rounded-lg border-2 border-dashed border-admin-border bg-white px-4 py-3 text-admin-body text-neutral-400 hover:bg-neutral-50">+ এখানে ব্লক যোগ করুন</button>}
          </div>
        </div>

        {/* right: property panel + page settings */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-admin-border bg-white p-3">
            <h3 className="text-admin-small font-medium text-neutral-700">পেজ সেটিংস</h3>
            <label className="mt-2 flex flex-col gap-1"><span className="text-admin-small text-neutral-600">শিরোনাম</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
            <label className="mt-1 flex flex-col gap-1"><span className="text-admin-small text-neutral-600">স্লাগ</span><input value={slug} onChange={(e) => setSlug(e.target.value)} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
            <label className="mt-1 flex items-center gap-1.5 text-admin-small text-neutral-700"><input type="checkbox" checked={showInMenu} onChange={(e) => setShowInMenu(e.target.checked)} className="h-3.5 w-3.5" /> মেনুতে দেখাবে</label>
            <label className="mt-1 flex flex-col gap-1"><span className="text-admin-small text-neutral-600">মেনু আইকন</span><input value={menuIcon} onChange={(e) => setMenuIcon(e.target.value)} placeholder="📄" className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
            <label className="mt-1 flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Meta title</span><input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
            <label className="mt-1 flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Meta description</span><input value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
            <label className="mt-1 flex flex-col gap-1"><span className="text-admin-small text-neutral-600">OG image</span><input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://..." className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
            <button onClick={handleSaveDraft} className="mt-3 h-8 w-full rounded-md border border-admin-border bg-white text-admin-small font-medium text-neutral-700 hover:bg-neutral-50">খসড়া সংরক্ষণ</button>
          </div>

          <div className="rounded-xl border border-admin-border bg-white p-3">
            <h3 className="text-admin-small font-medium text-neutral-700">নির্বাচিত ব্লক সম্পাদনা</h3>
            {selectedBlock ? (
              <div className="mt-2 flex flex-col gap-2">
                {selectedBlock.type === 'hero' && (
                  <>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">ছবি</span><input value={String(selectedBlock.image ?? '')} onChange={(e) => updateBlock(selected!, { image: e.target.value })} placeholder="https://..." className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">শিরোনাম</span><input value={String(selectedBlock.title ?? '')} onChange={(e) => updateBlock(selected!, { title: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">সাবটাইটেল</span><input value={String(selectedBlock.subtitle ?? '')} onChange={(e) => updateBlock(selected!, { subtitle: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                  </>
                )}
                {selectedBlock.type === 'rich_text' && (
                  <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Content HTML</span><textarea value={String(selectedBlock.content_html ?? '')} onChange={(e) => updateBlock(selected!, { content_html: e.target.value })} rows={6} className="rounded-md border border-admin-border px-2 py-1 text-admin-small" /></label>
                )}
                {selectedBlock.type === 'image' && (
                  <>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">ছবি</span><input value={String(selectedBlock.image ?? '')} onChange={(e) => updateBlock(selected!, { image: e.target.value })} placeholder="https://..." className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">ক্যাপশন</span><input value={String(selectedBlock.caption ?? '')} onChange={(e) => updateBlock(selected!, { caption: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                  </>
                )}
                {selectedBlock.type === 'poll' && (
                  <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Poll ID</span>
                    <select value={String(selectedBlock.poll_id ?? '')} onChange={(e) => updateBlock(selected!, { poll_id: e.target.value })} className="h-8 rounded-md border border-admin-border bg-white px-2 text-admin-small">
                      <option value="">বেছে নিন</option>{polls.map((p) => <option key={p.id} value={p.id}>{p.question.slice(0, 40)}</option>)}
                    </select>
                  </label>
                )}
                {selectedBlock.type === 'qa_embed' && (
                  <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Question ID</span>
                    <select value={String(selectedBlock.question_id ?? '')} onChange={(e) => updateBlock(selected!, { question_id: e.target.value })} className="h-8 rounded-md border border-admin-border bg-white px-2 text-admin-small">
                      <option value="">বেছে নিন</option>{questions.map((q) => <option key={q.id} value={q.id}>{q.title.slice(0, 40)}</option>)}
                    </select>
                  </label>
                )}
                {selectedBlock.type === 'doctor_grid' && (
                  <>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Heading</span><input value={String(selectedBlock.heading ?? '')} onChange={(e) => updateBlock(selected!, { heading: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <div className="flex flex-col gap-1">
                      <span className="text-admin-small text-neutral-600">Doctor IDs (comma-separated)</span>
                      <input value={Array.isArray(selectedBlock.doctor_ids) ? (selectedBlock.doctor_ids as string[]).join(',') : ''} onChange={(e) => updateBlock(selected!, { doctor_ids: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="uuid1,uuid2" className="h-8 rounded-md border border-admin-border px-2 text-admin-small" />
                      <span className="text-[11px] text-neutral-400">পিকার: {doctors.slice(0, 3).map((d) => (d.name_translations as { bn?: string } | null)?.bn ?? d.slug).join(', ')}...</span>
                    </div>
                  </>
                )}
                {selectedBlock.type === 'hospital_grid' && (
                  <>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Heading</span><input value={String(selectedBlock.heading ?? '')} onChange={(e) => updateBlock(selected!, { heading: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <input value={Array.isArray(selectedBlock.hospital_ids) ? (selectedBlock.hospital_ids as string[]).join(',') : ''} onChange={(e) => updateBlock(selected!, { hospital_ids: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="hospital uuids" className="h-8 rounded-md border border-admin-border px-2 text-admin-small" />
                  </>
                )}
                {selectedBlock.type === 'cta_banner' && (
                  <>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Title</span><input value={String(selectedBlock.title ?? '')} onChange={(e) => updateBlock(selected!, { title: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Button text</span><input value={String(selectedBlock.button_text ?? '')} onChange={(e) => updateBlock(selected!, { button_text: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Href</span><input value={String(selectedBlock.href ?? '')} onChange={(e) => updateBlock(selected!, { href: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Color</span>
                      <select value={String(selectedBlock.color ?? 'brand')} onChange={(e) => updateBlock(selected!, { color: e.target.value })} className="h-8 rounded-md border border-admin-border bg-white px-2 text-admin-small"><option value="brand">brand</option><option value="life">life</option><option value="emergency">emergency</option></select>
                    </label>
                  </>
                )}
                {selectedBlock.type === 'faq_accordion' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-admin-small text-neutral-600">Items</span>
                    {((selectedBlock.items as { question: string; answer: string }[]) ?? []).map((it, i) => (
                      <div key={i} className="flex flex-col gap-1 rounded-md border border-admin-border p-2">
                        <input value={it.question} onChange={(e) => { const items = [...(selectedBlock.items as { question: string; answer: string }[])]; items[i] = { ...items[i]!, question: e.target.value }; updateBlock(selected!, { items }); }} placeholder="প্রশ্ন" className="h-7 rounded border border-admin-border px-2 text-admin-small" />
                        <input value={it.answer} onChange={(e) => { const items = [...(selectedBlock.items as { question: string; answer: string }[])]; items[i] = { ...items[i]!, answer: e.target.value }; updateBlock(selected!, { items }); }} placeholder="উত্তর" className="h-7 rounded border border-admin-border px-2 text-admin-small" />
                        <button onClick={() => { const items = (selectedBlock.items as { question: string; answer: string }[]).filter((_, idx) => idx !== i); updateBlock(selected!, { items }); }} className="self-end text-admin-small text-emergency-600">মুছুন</button>
                      </div>
                    ))}
                    <button onClick={() => { const items = [...((selectedBlock.items as { question: string; answer: string }[]) ?? []), { question: '', answer: '' }]; updateBlock(selected!, { items }); }} className="h-7 rounded border border-admin-border bg-white text-admin-small text-neutral-700">+ প্রশ্ন যোগ করুন</button>
                  </div>
                )}
                {selectedBlock.type === 'spacer' && (
                  <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Size</span>
                    <select value={String(selectedBlock.size ?? 'medium')} onChange={(e) => updateBlock(selected!, { size: e.target.value })} className="h-8 rounded-md border border-admin-border bg-white px-2 text-admin-small"><option value="small">ছোট</option><option value="medium">মাঝারি</option><option value="large">বড়</option></select>
                  </label>
                )}
                {selectedBlock.type === 'magazine_grid' && (
                  <>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Heading</span><input value={String(selectedBlock.heading ?? '')} onChange={(e) => updateBlock(selected!, { heading: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Category filter</span><input value={String(selectedBlock.category ?? '')} onChange={(e) => updateBlock(selected!, { category: e.target.value })} placeholder="ঐচ্ছিক" className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                  </>
                )}
                {selectedBlock.type === 'report_form' && (
                  <>
                    <label className="flex flex-col gap-1"><span className="text-admin-small text-neutral-600">Form title</span><input value={String(selectedBlock.title ?? '')} onChange={(e) => updateBlock(selected!, { title: e.target.value })} className="h-8 rounded-md border border-admin-border px-2 text-admin-small" /></label>
                    <span className="text-admin-small text-neutral-500">Fields: JSON array — advanced (MVP: edit as JSON)</span>
                    <textarea value={JSON.stringify(selectedBlock.fields ?? [], null, 2)} onChange={(e) => { try { const v = JSON.parse(e.target.value); updateBlock(selected!, { fields: v }); } catch {} }} rows={4} className="rounded-md border border-admin-border px-2 py-1 font-mono text-[11px]" />
                  </>
                )}
              </div>
            ) : (
              <p className="mt-2 text-admin-small text-neutral-400">কোনো ব্লক নির্বাচিত নয় — ক্যানভাসে একটি ব্লকে ক্লিক করুন।</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog open={publishConfirm} title="প্রকাশ করবেন?" description={`এই পেজ এখন সবার জন্য দেখা যাবে এই লিংকে: vytanexa.app/page/${slug} — প্রকাশ করবেন?`} confirmLabel="হ্যাঁ, প্রকাশ করুন" variant="info" busy={busy} onConfirm={handlePublish} onCancel={() => setPublishConfirm(false)} />
    </div>
  );
}
