import { DoctorCard } from '@/components/shared/DoctorCard';
import type { HospitalDetail } from '@/lib/queries/hospital-detail';

type Link = HospitalDetail['doctor_hospital_links'][number];

/**
 * Tab 2 — ডাক্তার (Available Doctors) — VYTANEXA-BLUEPRINT.md § S08
 * Tab 2: "Reverse of S07 Tab 4 — list of doctors linked via
 * doctor_hospital_links who visit this hospital, using compact Doctor
 * Card variant (same as S06), each with role label." Reuses
 * `DoctorCard` (S06/S04) rather than a new component — same card,
 * different data source.
 */
export function DoctorsTab({ links }: { links: Link[] }) {
  const sorted = [...links]
    .filter((l): l is Link & { doctors: NonNullable<Link['doctors']> } => l.doctors !== null)
    .sort((a, b) => a.display_order - b.display_order);

  if (sorted.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-[14px] text-neutral-500">এখনো কোনো ডাক্তারের তথ্য যোগ হয়নি।</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      {sorted.map((link) => (
        <div key={link.id}>
          {link.role && (
            <p className="mb-1 ml-4 text-[12px] font-semibold text-brand-600">{link.role}</p>
          )}
          <DoctorCard doctor={link.doctors} />
        </div>
      ))}
    </div>
  );
}
