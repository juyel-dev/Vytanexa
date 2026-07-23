'use client';

import { useState } from 'react';
import { getLocalizedField } from '@/lib/i18n';
import type { DoctorDetail } from '@/lib/queries/doctor-detail';

/**
 * Tab 1 — তথ্য (Info) — VYTANEXA-BLUEPRINT.md § S07 Tab 1.
 *
 * Schema note: the spec's mockup shows structured education entries
 * ("Degree — Institution (Year)"), but `doctors.degree` is a flat
 * text array (DATABASE-SCHEMA.md § 2.2) — there's no institution/year
 * breakdown in the schema. Rendering the array as-is (each degree its
 * own line) is the honest representation of what data actually
 * exists, rather than fabricating institution/year fields that would
 * just be empty. If structured education history becomes a real
 * product need, that's a schema addition, not a UI workaround.
 */
export function InfoTab({ doctor }: { doctor: DoctorDetail }) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const bio = getLocalizedField(doctor.bio_translations);

  return (
    <div className="divide-y divide-neutral-100">
      {bio && (
        <section className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">📝 সম্পর্কে</h3>
          <p
            className={`text-[14px] leading-relaxed text-neutral-700 ${!bioExpanded ? 'line-clamp-4' : ''}`}
          >
            {bio}
          </p>
          {bio.length > 200 && (
            <button
              onClick={() => setBioExpanded((v) => !v)}
              className="mt-1 text-[13px] text-brand-600"
            >
              {bioExpanded ? 'কম দেখুন ▲' : 'আরো পড়ুন ▾'}
            </button>
          )}
        </section>
      )}

      {doctor.degree.length > 0 && (
        <section className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">🎓 শিক্ষাগত যোগ্যতা</h3>
          {doctor.degree.map((d) => (
            <p key={d} className="flex items-start gap-2 py-1 text-[14px] text-neutral-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
              {d}
            </p>
          ))}
        </section>
      )}

      {doctor.expertise_tags.length > 0 && (
        <section className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">🏆 বিশেষজ্ঞতার ক্ষেত্র</h3>
          <div className="flex flex-wrap gap-2">
            {doctor.expertise_tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-50 px-3 py-1 text-[12px] text-brand-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {doctor.treats_conditions.length > 0 && (
        <section className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">💊 যেসব রোগের চিকিৎসা দেন</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {doctor.treats_conditions.map((c) => (
              <p key={c} className="flex items-start gap-1.5 text-[13px] text-neutral-700">
                <span className="text-neutral-400">•</span> {c}
              </p>
            ))}
          </div>
        </section>
      )}

      {doctor.languages.length > 0 && (
        <section className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">🗣️ ভাষা</h3>
          <div className="flex flex-wrap gap-2">
            {doctor.languages.map((lang) => (
              <span
                key={lang}
                className="rounded-full bg-life-50 px-3 py-1 text-[12px] text-life-700"
              >
                {lang === 'bn' ? 'বাংলা' : lang === 'en' ? 'English' : lang === 'hi' ? 'हिन्दी' : lang}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
