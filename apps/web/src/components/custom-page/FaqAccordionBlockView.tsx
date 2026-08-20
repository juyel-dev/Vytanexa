'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FaqAccordionBlock } from '@/lib/custom-page-blocks';

/** `faq_accordion` block — VYTANEXA-BLUEPRINT.md § S19: "Question/answer expandable list." */
export function FaqAccordionBlockView({ block }: { block: FaqAccordionBlock }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!block.items || block.items.length === 0) return null;

  return (
    <div className="px-4 py-4">
      {block.heading && (
        <h2 className="mb-3 text-[16px] font-bold text-neutral-900">{block.heading}</h2>
      )}
      <div className="space-y-2">
        {block.items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="rounded-lg border border-neutral-200">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-[14px] font-medium text-neutral-800">{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <p className="border-t border-neutral-100 px-4 py-3 text-[13px] leading-relaxed text-neutral-600">
                  {item.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
