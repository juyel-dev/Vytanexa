'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type FaqItem = { question: string; answer: string };

export function SeoFaq({ faqs }: { faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (faqs.length === 0) return null;

  return (
    <section className="mx-4 mt-6 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="text-[15px] font-bold text-neutral-900">প্রায়শই জিজ্ঞাসিত প্রশ্ন</h2>
      <div className="mt-3 divide-y divide-neutral-100">
        {faqs.map((f, i) => {
          const open = openIndex === i;
          return (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left"
                aria-expanded={open}
              >
                <span className="text-[14px] font-semibold text-neutral-800">{f.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open && <p className="pb-3 text-[13px] leading-6 text-neutral-600">{f.answer}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
