import Link from 'next/link';

/**
 * Recent Activity — ADMIN-PANEL-SPEC.md § A03 "Recent Admin Activity".
 * Reads `audit_logs` (last 5) joined to `admin_users(name)` for a
 * human-readable description. Full detail lives in A14's dedicated
 * Audit Log viewer — this is the dashboard teaser.
 *
 * Action descriptions are generated from `{action, entity_type,
 * entity_id}` via a small formatter map (the audit log stores
 * machine-readable action names; the operator sees plain-language
 * Bengali).
 */
type Row = {
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  admin_users: { name: string } | null;
};

const ACTION_LABEL: Record<string, string> = {
  create: 'তৈরি করেছেন',
  update: 'সংশোধন করেছেন',
  delete: 'মুছে ফেলেছেন',
  restore: 'পূর্বাবস্থায় ফেরিয়েছেন',
  publish: 'প্রকাশ করেছেন',
  verify: 'ভেরিফাই করেছেন',
  reject: 'প্রত্যাখ্যান করেছেন',
  suspend: 'সাসপেন্ড করেছেন',
  moderate: 'মডারেশন করেছেন',
};

export function RecentActivity({ activity }: { activity: Row[] }) {
  if (activity.length === 0) {
    return (
      <div className="rounded-lg border border-admin-border bg-white p-4">
        <h2 className="text-admin-h2 text-neutral-900">সাম্প্রতিক অ্যাডমিন কার্যকলাপ</h2>
        <p className="mt-2 text-admin-body text-neutral-500">কোনো অ্যাক্টিভিটি নেই</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-admin-border bg-white p-4">
      <h2 className="text-admin-h2 text-neutral-900">সাম্প্রতিক অ্যাডমিন কার্যকলাপ</h2>
      <ul className="mt-2 divide-y divide-admin-border">
        {activity.map((row, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-admin-body">
            <span className="min-w-0 truncate">
              <span className="font-medium text-neutral-800">{row.admin_users?.name ?? 'অ্যাডমিন'}</span>{' '}
              {ACTION_LABEL[row.action] ?? row.action}{' '}
              <span className="text-neutral-500">{row.entity_type}</span>
            </span>
            <span className="shrink-0 text-admin-small text-neutral-400">
              {new Date(row.created_at).toLocaleDateString('bn-BD')}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/audit-log"
        className="mt-2 inline-block text-admin-small font-semibold text-brand-700"
      >
        পুরো অডিট লগ দেখুন →
      </Link>
    </div>
  );
}