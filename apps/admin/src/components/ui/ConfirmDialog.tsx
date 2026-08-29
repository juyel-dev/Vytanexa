/**
 * ConfirmDialog — ADMIN-PANEL-SPEC.md § A01 "Core Component Additions".
 * "Every destructive action (delete, reject, suspend) routes through one
 * shared confirm component: shows what will happen in plain language,
 * requires explicit confirm click, never a silent one-tap delete."
 *
 * This is the primary safety net against admin mistakes alongside
 * soft-delete + audit log. Usage: render `<ConfirmDialog open=... />`
 * with `onConfirm`/`onCancel`; the parent keeps its own state.
 */
import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'নিশ্চিত করুন',
  cancelLabel = 'বাতিল',
  variant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the CANCEL button (safe default) — a destructive dialog
    // should never make it easy to confirm with a stray keypress.
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) return null;

  const STYLES: Record<ConfirmVariant, { icon: string; button: string }> = {
    danger: { icon: 'text-emergency-600', button: 'bg-emergency-600 hover:bg-emergency-700' },
    warning: { icon: 'text-accent-600', button: 'bg-accent-500 hover:bg-accent-600' },
    info: { icon: 'text-brand-600', button: 'bg-brand-600 hover:bg-brand-700' },
  };
  const s = STYLES[variant];

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        aria-hidden
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-md rounded-xl border border-admin-border bg-white p-5 shadow-xl animate-scale-in"
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100`}>
            <AlertTriangle className={`h-5 w-5 ${s.icon}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-admin-h2 text-neutral-900">
              {title}
            </h2>
            <p className="mt-1 text-admin-body text-neutral-600">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={ref}
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`h-10 rounded-md px-4 text-admin-body font-semibold text-white ${s.button} disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600`}
          >
            {busy ? 'প্রসেস হচ্ছে...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}