/**
 * Summary Cards — ADMIN-PANEL-SPEC.md § A03 "Dashboard Home":
 * vanity-metrics row (totals/charts) positioned as secondary/contextual
 * below the attention row. Solo-operator friendly: a live total is more
 * useful than a line chart for day-one confidence.
 */
import Link from 'next/link';

type Totals = { doctors: number; hospitals: number };

export function SummaryCards({ totals }: { totals: Totals }) {
  return (
    <div>
      <h2 className="mb-2 text-admin-h2 text-neutral-900">এই মাসের সংক্ষিপ্ত চিত্র</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-admin-border bg-white p-4">
          <p className="text-admin-small text-neutral-500">মোট ডাক্তার</p>
          <p className="mt-1 text-[24px] font-bold text-neutral-900">{totals.doctors}</p>
          <Link href="/doctors" className="mt-2 inline-block text-admin-small font-semibold text-brand-700">
            তালিকা দেখুন →
          </Link>
        </div>
        <div className="rounded-lg border border-admin-border bg-white p-4">
          <p className="text-admin-small text-neutral-500">মোট হাসপাতাল</p>
          <p className="mt-1 text-[24px] font-bold text-neutral-900">{totals.hospitals}</p>
          <Link href="/hospitals" className="mt-2 inline-block text-admin-small font-semibold text-brand-700">
            তালিকা দেখুন →
          </Link>
        </div>
      </div>
    </div>
  );
}