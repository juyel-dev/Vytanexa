'use client';

import { AlertTriangle } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';

/**
 * More Options Sheet — the "⋯ menu" S15 refers to on Doctor Profile /
 * Hospital Detail. Currently a single item (report wrong info); a
 * real dropdown/menu component would be overkill for one row, but
 * this stays a distinct component (rather than inlining the button
 * directly) so a second menu item later doesn't require restructuring
 * both pages that use it.
 */
export function MoreOptionsSheet({
  open,
  onClose,
  onReportClick,
}: {
  open: boolean;
  onClose: () => void;
  onReportClick: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="আরও অপশন">
      <button
        onClick={() => {
          onClose();
          onReportClick();
        }}
        className="flex w-full items-center gap-3 rounded-md border border-neutral-200 px-4 py-3.5 text-left text-[14px] font-medium text-neutral-800"
      >
        <AlertTriangle className="h-4 w-4 text-neutral-500" />
        তথ্য ভুল আছে?
      </button>
    </BottomSheet>
  );
}
