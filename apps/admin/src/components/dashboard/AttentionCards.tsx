/**
 * Attention Cards — ADMIN-PANEL-SPEC.md § A03 "Attention Cards".
 *
 * Each card: count (large, 28px bold), label, colored left-border
 * matching urgency (reports=emergency-500, reviews/QA=accent-500,
 * leads=brand-600), "দেখুন →" jumps directly into that queue with
 * filters pre-applied. Card count = 0 → card auto-hides (no "0
 * pending" clutter); if ALL queues are empty the whole attention row
 * collapses to a friendly single-line state (handled by the parent
 * page, not here).
 */
import Link from 'next/link';

type Pending = { reviews: number; qa: number; reports: number; leads: number };

const CARDS: {
  key: keyof Pending;
  href: string;
  labelBn: string;
  labelEn: string;
  border: string;
  bg: string;
}[] = [
  {
    key: 'reviews',
    href: '/moderation/reviews?status=pending',
    labelBn: 'রিভিউ অপেক্ষমাণ',
    labelEn: 'Reviews pending',
    border: 'border-accent-500',
    bg: 'bg-accent-50',
  },
  {
    key: 'qa',
    href: '/moderation/qa?status=pending',
    labelBn: 'প্রশ্ন অপেক্ষমাণ',
    labelEn: 'Questions pending',
    border: 'border-accent-500',
    bg: 'bg-accent-50',
  },
  {
    key: 'reports',
    href: '/moderation/reports?status=open',
    labelBn: 'তথ্য রিপোর্ট খোলা',
    labelEn: 'Reports open',
    border: 'border-emergency-500',
    bg: 'bg-emergency-50',
  },
  {
    key: 'leads',
    href: '/leads?status=new',
    labelBn: 'নতুন লিড',
    labelEn: 'New leads',
    border: 'border-brand-600',
    bg: 'bg-brand-50',
  },
];

export function AttentionCards({ pending }: { pending: Pending }) {
  const visible = CARDS.filter((c) => pending[c.key] > 0);
  if (visible.length === 0) return null;

  return (
    <div>
      <h2 className="mb-2 text-admin-h2 text-neutral-900">আজ যা মনোযোগ দরকার</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {visible.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className={`rounded-lg border-l-4 ${c.border} ${c.bg} px-4 py-3 transition hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600`}
          >
            <p className="text-[28px] font-bold leading-none text-neutral-900">
              {pending[c.key] > 99 ? '99+' : pending[c.key]}
            </p>
            <p className="mt-1 text-admin-body text-neutral-700">{c.labelBn}</p>
            <p className="mt-0.5 text-admin-small text-neutral-500">{c.labelEn}</p>
            <span className="mt-2 inline-block text-admin-small font-semibold text-brand-700">
              দেখুন →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}