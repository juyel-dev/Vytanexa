'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Responsive modal surface shared by location and emergency flows.
 * It remains a bottom sheet on phones and becomes a centered dialog
 * on larger screens without changing the content or adding a dependency.
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
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousOverflow = body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.overflow = previousOverflow;
      window.scrollTo(0, scrollY);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-sheet flex items-end justify-center md:items-center md:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-label={title ? `Close ${title}` : 'Close dialog'}
        className="absolute inset-0 cursor-default bg-neutral-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        tabIndex={-1}
        className="relative z-10 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slide-up md:max-h-[min(80dvh,44rem)] md:w-full md:max-w-[32rem] md:rounded-2xl"
      >
        <div className="relative flex shrink-0 items-center justify-center border-b border-neutral-100 px-12 py-4 md:py-5">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-neutral-300 md:hidden" />
          {title && (
            <h2 id={titleId} className="text-center text-[16px] font-semibold text-neutral-900">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={title ? `Close ${title}` : 'Close dialog'}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 md:right-4"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
