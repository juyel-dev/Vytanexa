import Link from 'next/link';
import { Stethoscope, Building2, FlaskConical, Siren } from 'lucide-react';
import { getT } from '@vytanexa/i18n/server';

/**
 * Quick Actions Row — VYTANEXA-BLUEPRINT.md § S04 SEC-04
 * 4 static shortcuts, equal width. No DB dependency — these targets
 * are fixed routes, not data-driven.
 */
export async function QuickActionsRow() {
  const t = await getT('home.quickActionsSection');
  const ACTIONS = [
    { href: '/doctors', label: t('findDoctors'), icon: Stethoscope, bg: 'bg-brand-50', fg: 'text-brand-600' },
    { href: '/hospitals', label: t('findHospitals'), icon: Building2, bg: 'bg-life-50', fg: 'text-life-600' },
    { href: '/health/lab-tests', label: t('labTests'), icon: FlaskConical, bg: 'bg-accent-50', fg: 'text-accent-500' },
    { href: '/emergency', label: t('emergencyContact'), icon: Siren, bg: 'bg-emergency-50', fg: 'text-emergency-600' },
  ];

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
