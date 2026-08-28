import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export type Crumb = { label: string; href?: string };

export function SeoBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-x-auto px-4 py-3 text-[13px] [scrollbar-width:none]">
      {crumbs.map((c, i) => (
        <span key={i} className="flex shrink-0 items-center gap-1.5">
          {c.href ? (
            <Link href={c.href} className="text-brand-600 hover:underline">
              {c.label}
            </Link>
          ) : (
            <span className="font-semibold text-neutral-800">{c.label}</span>
          )}
          {i < crumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />}
        </span>
      ))}
    </nav>
  );
}
