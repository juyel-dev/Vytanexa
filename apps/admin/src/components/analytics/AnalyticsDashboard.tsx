'use client';

import Link from 'next/link';

type Cards = { pageViews: number; pageViewsDelta: number; callClicks: number; waClicks: number; newLeads: number };

export function AnalyticsDashboard({
  range,
  cards,
  daily,
  topDoctors,
  topSearches,
  topLocations,
}: {
  range: string;
  cards: Cards;
  daily: { date: string; count: number }[];
  topDoctors: { id: string; name: string; views: number }[];
  topSearches: { query: string; count: number }[];
  topLocations: { id: string; name: string; count: number }[];
}) {
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));

  const exportCsv = (rows: { header: string; rows: string[][] }, filename: string) => {
    const csv = [rows.header, ...rows.rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-admin-small text-neutral-500">তারিখ পরিসীমা:</span>
        <Link href="/analytics?range=7d" className={`h-8 rounded-full px-3 text-admin-small font-medium ${range === '7d' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}>গত ৭ দিন</Link>
        <Link href="/analytics?range=30d" className={`h-8 rounded-full px-3 text-admin-small font-medium ${range === '30d' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}>গত ৩০ দিন</Link>
        <Link href="/analytics?range=90d" className={`h-8 rounded-full px-3 text-admin-small font-medium ${range === '90d' ? 'bg-brand-600 text-white' : 'border border-admin-border bg-white text-neutral-700 hover:bg-neutral-50'}`}>গত ৯০ দিন</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-admin-border bg-white p-4">
          <p className="text-admin-small text-neutral-500">পেজ ভিউ</p>
          <p className="mt-1 text-[24px] font-bold text-neutral-900">{cards.pageViews.toLocaleString('bn-BD')}</p>
          <p className={`text-admin-small ${cards.pageViewsDelta >= 0 ? 'text-life-600' : 'text-emergency-600'}`}>{cards.pageViewsDelta >= 0 ? '↑' : '↓'} {Math.abs(cards.pageViewsDelta)}%</p>
        </div>
        <div className="rounded-xl border border-admin-border bg-white p-4">
          <p className="text-admin-small text-neutral-500">কল ক্লিক</p>
          <p className="mt-1 text-[24px] font-bold text-neutral-900">{cards.callClicks.toLocaleString('bn-BD')}</p>
        </div>
        <div className="rounded-xl border border-admin-border bg-white p-4">
          <p className="text-admin-small text-neutral-500">WhatsApp ক্লিক</p>
          <p className="mt-1 text-[24px] font-bold text-neutral-900">{cards.waClicks.toLocaleString('bn-BD')}</p>
        </div>
        <div className="rounded-xl border border-admin-border bg-white p-4">
          <p className="text-admin-small text-neutral-500">নতুন লিড</p>
          <p className="mt-1 text-[24px] font-bold text-neutral-900">{cards.newLeads.toLocaleString('bn-BD')}</p>
        </div>
      </div>

      <div className="rounded-xl border border-admin-border bg-white p-4">
        <h2 className="text-admin-h3 text-neutral-900">দৈনিক ট্রাফিক</h2>
        <div className="mt-3 flex items-end gap-[2px] h-24">
          {daily.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-brand-600" style={{ height: `${Math.max(4, (d.count / maxDaily) * 80)}px` }} title={`${d.date}: ${d.count}`} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
          <span>{daily[0]?.date ?? ''}</span>
          <span>{daily[daily.length - 1]?.date ?? ''}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-admin-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-admin-h3 text-neutral-900">টপ ডাক্তার (ভিউ অনুযায়ী)</h3>
            <button onClick={() => exportCsv({ header: 'rank,name,views', rows: topDoctors.map((d, i) => [String(i + 1), d.name, String(d.views)]) }, `top-doctors-${range}.csv`)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50">CSV</button>
          </div>
          <ul className="mt-2 divide-y divide-admin-border">
            {topDoctors.length === 0 ? <li className="py-2 text-admin-small text-neutral-500">কোনো ডেটা নেই</li> : topDoctors.map((d, i) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-admin-body">
                <span className="text-neutral-700">{i + 1}. {d.name}</span>
                <span className="text-admin-small text-neutral-500">{d.views.toLocaleString('bn-BD')}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-admin-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-admin-h3 text-neutral-900">টপ সার্চ কোয়েরি</h3>
            <button onClick={() => exportCsv({ header: 'rank,query,count', rows: topSearches.map((s, i) => [String(i + 1), s.query, String(s.count)]) }, `top-search-${range}.csv`)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50">CSV</button>
          </div>
          <ul className="mt-2 divide-y divide-admin-border">
            {topSearches.length === 0 ? <li className="py-2 text-admin-small text-neutral-500">কোনো সার্চ নেই</li> : topSearches.map((s, i) => (
              <li key={s.query} className="flex items-center justify-between py-2 text-admin-body">
                <span className="truncate text-neutral-700">{i + 1}. {s.query}</span>
                <span className="ml-2 shrink-0 text-admin-small text-neutral-500">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-admin-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-admin-h3 text-neutral-900">এলাকা অনুযায়ী ট্রাফিক</h3>
            <button onClick={() => exportCsv({ header: 'rank,location,count', rows: topLocations.map((l, i) => [String(i + 1), l.name, String(l.count)]) }, `top-locations-${range}.csv`)} className="rounded-md border border-admin-border bg-white px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50">CSV</button>
          </div>
          <ul className="mt-2 divide-y divide-admin-border">
            {topLocations.length === 0 ? <li className="py-2 text-admin-small text-neutral-500">কোনো ডেটা নেই</li> : topLocations.map((l, i) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-admin-body">
                <span className="text-neutral-700">{i + 1}. {l.name}</span>
                <span className="text-admin-small text-neutral-500">{l.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
