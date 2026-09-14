import Link from 'next/link';
import { getT } from '@vytanexa/i18n/server';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/**
 * Blood Services CTA — VYTANEXA-BLUEPRINT.md § S04 SEC-12
 * Static banner, no query needed — always visible per spec (admin
 * toggle for this section lives in homepage_settings, not a data
 * dependency of the component itself).
 */
export async function BloodServicesCTA() {
  const t = await getT('home.bloodCta');
  return (
    <section className="mx-4 my-3 rounded-xl border border-emergency-100 border-l-4 border-l-emergency-600 bg-emergency-50 p-4">
      <span className="text-2xl">🩸</span>
      <h2 className="font-bengali-display mt-1 text-[17px] font-bold text-emergency-700">
        {t('heading')}
      </h2>
      <p className="text-[13px] text-neutral-600">{t('subtitle')}</p>

      <div className="my-3 flex flex-wrap gap-1.5">
        {/* BLOOD-SERVICE-PLAN.md Phase C.5 — these were plain <span>s,
            not tappable at all; now each jumps straight to the blood
            services page pre-filtered to that group. */}
        {BLOOD_GROUPS.map((g) => (
          <Link
            key={g}
            href={`/health/blood-services?group=${encodeURIComponent(g)}`}
            className="rounded-full bg-emergency-100 px-2 py-0.5 text-[11px] font-semibold text-emergency-700"
          >
            {g}
          </Link>
        ))}
      </div>

      <Link
        href="/health/blood-services"
        className="block rounded-md bg-emergency-600 py-3 text-center text-[15px] font-semibold text-white"
      >
        {t('cta')}
      </Link>
    </section>
  );
}
