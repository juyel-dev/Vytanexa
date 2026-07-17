import Link from 'next/link';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/**
 * Blood Services CTA — VYTANEXA-BLUEPRINT.md § S04 SEC-12
 * Static banner, no query needed — always visible per spec (admin
 * toggle for this section lives in homepage_settings, not a data
 * dependency of the component itself).
 */
export function BloodServicesCTA() {
  return (
    <section className="mx-4 my-3 rounded-xl border border-emergency-100 border-l-4 border-l-emergency-600 bg-emergency-50 p-4">
      <span className="text-2xl">🩸</span>
      <h2 className="font-bengali-display mt-1 text-[17px] font-bold text-emergency-700">
        রক্তের প্রয়োজন?
      </h2>
      <p className="text-[13px] text-neutral-600">আপনার কাছের ব্লাড ব্যাংক খুঁজুন</p>

      <div className="my-3 flex flex-wrap gap-1.5">
        {BLOOD_GROUPS.map((g) => (
          <span
            key={g}
            className="rounded-full bg-emergency-100 px-2 py-0.5 text-[11px] font-semibold text-emergency-700"
          >
            {g}
          </span>
        ))}
      </div>

      <Link
        href="/health/blood-services"
        className="block rounded-md bg-emergency-600 py-3 text-center text-[15px] font-semibold text-white"
      >
        ব্লাড সার্ভিস দেখুন →
      </Link>
    </section>
  );
}
