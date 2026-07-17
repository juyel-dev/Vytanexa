'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Bottom Sheet — shared modal pattern referenced throughout
 * VYTANEXA-BLUEPRINT.md (S02 § 2.2 Variant E, S03 Location Picker,
 * S07 Review/Appointment sheets, S12 Emergency FAB condensed sheets,
 * and more). Built once here as infrastructure rather than
 * re-implemented per screen.
 *
 * Backdrop tap or Escape closes it (matches spec: "Bottom sheet close
 * — does NOT go back" in S02 § 8, i.e. it's a UI-state close, not a
 * route navigation).
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-sheet flex items-end">
      <div
        className="absolute inset-0 bg-neutral-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-lg animate-slide-up"
      >
        <div className="flex justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-neutral-300" />
        </div>
        {title && (
          <div className="border-b border-neutral-100 px-4 py-3">
            <h2 className="text-center text-[16px] font-semibold text-neutral-900">
              {title}
            </h2>
          </div>
        )}
        <div className="overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>,
    document.body
  );
}
