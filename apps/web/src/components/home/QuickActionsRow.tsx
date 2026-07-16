import Link from 'next/link';
import { Stethoscope, Building2, FlaskConical, Siren } from 'lucide-react';

/**
 * Quick Actions Row — VYTANEXA-BLUEPRINT.md § S04 SEC-04
 * 4 static shortcuts, equal width. No DB dependency — these targets
 * are fixed routes, not data-driven.
 */
const ACTIONS = [
  { href: '/doctors', label: 'ডাক্তার\nখুঁজুন', icon: Stethoscope, bg: 'bg-brand-50', fg: 'text-brand-600' },
  { href: '/hospitals', label: 'হাসপাতাল\nখুঁজুন', icon: Building2, bg: 'bg-life-50', fg: 'text-life-600' },
  { href: '/health/lab-tests', label: 'ল্যাব\nটেস্ট', icon: FlaskConical, bg: 'bg-accent-50', fg: 'text-accent-500' },
  { href: '/emergency', label: 'জরুরি\nযোগাযোগ', icon: Siren, bg: 'bg-emergency-50', fg: 'text-emergency-600' },
];

export function QuickActionsRow() {
  return (
    <section className="grid grid-cols-4 gap-3 px-4 py-3">
      {ACTIONS.map(({ href, label, icon: Icon, bg, fg }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-3 shadow-sm transition-transform active:scale-95"
        >
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${bg}`}>
            <Icon className={`h-6 w-6 ${fg}`} />
          </span>
          <span className="whitespace-pre-line text-center text-[11px] leading-tight text-neutral-700">
            {label}
          </span>
        </Link>
      ))}
    </section>
  );
}
