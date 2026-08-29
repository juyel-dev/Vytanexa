'use client';

import { useState } from 'react';
import { Download, FileUp, X } from 'lucide-react';

type Props = { open: boolean; onClose: () => void; onImported: () => void };

type PreviewRow = {
  state_bn: string;
  state_en: string;
  district_bn: string;
  district_en: string;
  sub_district_bn: string;
  sub_district_en: string;
  slug: string;
  latitude: string;
  longitude: string;
};

/** Parse a CSV text handling quoted commas — minimal, honest, no external dep. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') {
        row.push(cur.trim());
        cur = '';
      } else if (ch === '\n') {
        row.push(cur.trim());
        rows.push(row);
        row = [];
        cur = '';
      } else if (ch === '\r') {
        // skip, \n handles line
      } else cur += ch;
    }
  }
  row.push(cur.trim());
  rows.push(row);
  // drop trailing empty row from final newline
  return rows.filter((r) => r.some((c) => c !== ''));
}

const TEMPLATE_HEADERS = [
  'state_name_bn',
  'state_name_en',
  'district_name_bn',
  'district_name_en',
  'sub_district_name_bn',
  'sub_district_name_en',
  'slug',
  'latitude',
  'longitude',
];

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(',');
  const example = [
    'পশ্চিমবঙ্গ,West Bengal,,,,,,22.57,88.36',
    'পশ্চিমবঙ্গ,West Bengal,কোচবিহার,Cooch Behar,,,,26.32,89.45',
    'পশ্চিমবঙ্গ,West Bengal,কোচবিহার,Cooch Behar,তুফানগঞ্জ,Tufanganj,,26.31,89.66',
  ].join('\n');
  const csv = header + '\n' + example + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vytanexa-locations-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function LocationImportDialog({ open, onClose, onImported }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; skippedRows: { row: number; reason: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParseError(null);
    setPreview(null);
    setResult(null);
    setError(null);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setParseError('CSV-এ অন্তত একটি হেডার ও একটি ডেটা সারি থাকতে হবে');
      return;
    }
    const header = (rows[0] as string[]).map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    // support both spec header variants
    const pick = (row: string[], ...names: string[]) => {
      for (const n of names) {
        const i = idx(n);
        if (i >= 0) return row[i] ?? '';
      }
      return '';
    };
    const out: PreviewRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]!;
      out.push({
        state_bn: pick(r, 'state_name_bn', 'state_bn'),
        state_en: pick(r, 'state_name_en', 'state_en'),
        district_bn: pick(r, 'district_name_bn', 'district_bn'),
        district_en: pick(r, 'district_name_en', 'district_en'),
        sub_district_bn: pick(r, 'sub_district_name_bn', 'sub_district_bn'),
        sub_district_en: pick(r, 'sub_district_name_en', 'sub_district_en'),
        slug: pick(r, 'slug'),
        latitude: pick(r, 'latitude', 'lat'),
        longitude: pick(r, 'longitude', 'lng', 'long'),
      });
    }
    setPreview(out);
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;
    setBusy(true);
    setError(null);
    // Map preview rows to the API's expected shape
    const rows = preview.map((r) => ({
      state_bn: r.state_bn,
      state_en: r.state_en,
      district_bn: r.district_bn,
      district_en: r.district_en,
      sub_district_bn: r.sub_district_bn,
      sub_district_en: r.sub_district_en,
      slug: r.slug,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
    const res = await fetch('/api/admin/locations/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setError(data?.error ?? 'আমদানি করা যায়নি — আবার চেষ্টা করুন');
      return;
    }
    const data = (await res.json()) as { created: number; skippedCount: number; skipped: { row: number; reason: string }[] };
    setResult({ created: data.created, skipped: data.skippedCount ?? 0, skippedRows: data.skipped ?? [] });
    if (data.created > 0) onImported();
  };

  const reset = () => {
    setFileName(null);
    setPreview(null);
    setParseError(null);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={handleClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-admin-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-admin-border px-5 py-3">
          <h2 className="text-admin-h2 text-neutral-900">CSV থেকে আমদানি করুন</h2>
          <button onClick={handleClose} className="rounded p-1 text-neutral-500 hover:bg-neutral-50" aria-label="বন্ধ করুন">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-dashed border-admin-border bg-neutral-50 px-4 py-3">
            <p className="text-admin-body text-neutral-700">
              টেমপ্লেট নামিয়ে স্প্রেডশিটে ভরুন, তারপর এখানে আপলোড করুন। প্রতিটি সারি একটি এলাকা — ফাঁকা কলাম মানেই সেই স্তর নেই। প্যারেন্টের নাম সব সারিতে একই বানানে লিখতে হবে।
            </p>
            <button
              onClick={downloadTemplate}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-admin-border bg-white px-3 py-1.5 text-admin-small font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Download className="h-4 w-4" /> টেমপ্লেট ডাউনলোড করুন (.csv)
            </button>
            <p className="mt-2 text-admin-small text-neutral-400">
              কলাম: {TEMPLATE_HEADERS.join(', ')} — slug/অক্ষাংশ/দ্রাঘিমাংশ ফাঁকা রাখা যায়।
            </p>
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-6 text-admin-body text-brand-700 hover:bg-brand-100">
            <FileUp className="h-5 w-5" />
            {fileName ? fileName : 'CSV ফাইল বেছে নিন'}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </label>

          {parseError && <p className="rounded-md bg-emergency-50 px-3 py-2 text-admin-body text-emergency-700">{parseError}</p>}

          {preview && (
            <>
              <div className="overflow-x-auto rounded-lg border border-admin-border">
                <table className="w-full text-left text-admin-small">
                  <thead className="bg-neutral-50 text-neutral-500">
                    <tr>
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">State</th>
                      <th className="px-2 py-1.5">District</th>
                      <th className="px-2 py-1.5">Sub-district</th>
                      <th className="px-2 py-1.5">Slug</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {preview.slice(0, 30).map((r, i) => {
                      const deepest = r.sub_district_bn || r.sub_district_en ? 'sub-district' : r.district_bn || r.district_en ? 'district' : 'state';
                      return (
                        <tr key={i} className={deepest === 'state' ? 'bg-white' : deepest === 'district' ? 'bg-neutral-50/50' : 'bg-brand-50/30'}>
                          <td className="px-2 py-1.5 text-neutral-400">{i + 1}</td>
                          <td className="px-2 py-1.5">{r.state_bn || r.state_en || '—'}</td>
                          <td className="px-2 py-1.5">{r.district_bn || r.district_en || '—'}</td>
                          <td className="px-2 py-1.5">{r.sub_district_bn || r.sub_district_en || '—'}</td>
                          <td className="px-2 py-1.5 text-neutral-400">{r.slug || 'auto'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {preview.length > 30 && (
                <p className="text-admin-small text-neutral-400">আরও {preview.length - 30}টি সারি আছে — আমদানির পর সব প্রসেস হবে।</p>
              )}
              <p className="text-admin-small text-neutral-500">
                মোট {preview.length}টি সারি — আমদানি করলে ডুপ্লিকেট স্লাগ স্কিপ হবে, প্যারেন্ট না পেলে সেই সারি স্কিপ হবে।
              </p>
            </>
          )}

          {error && <p className="rounded-md bg-emergency-50 px-3 py-2 text-admin-body text-emergency-700">{error}</p>}

          {result && (
            <div className="rounded-lg border border-life-200 bg-life-50 px-4 py-3 text-admin-body">
              <p className="font-medium text-life-800">
                ✅ {result.created}টি তৈরি হয়েছে · {result.skipped}টি স্কিপ হয়েছে
              </p>
              {result.skippedRows.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-admin-small text-neutral-600">
                  {result.skippedRows.slice(0, 20).map((s) => (
                    <li key={s.row}>
                      সারি {s.row}: {s.reason}
                    </li>
                  ))}
                  {result.skippedRows.length > 20 && <li>…আরও {result.skippedRows.length - 20}টি</li>}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-admin-border px-5 py-3">
          <button onClick={handleClose} className="h-10 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">
            বন্ধ করুন
          </button>
          {preview && !result && (
            <button
              onClick={handleImport}
              disabled={busy}
              className="h-10 rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? 'আমদানি হচ্ছে...' : `আমদানি করুন (${preview.length} সারি)`}
            </button>
          )}
          {result && result.created > 0 && (
            <button onClick={handleClose} className="h-10 rounded-md bg-life-600 px-5 text-admin-body font-semibold text-white hover:bg-life-700">
              সম্পন্ন
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
