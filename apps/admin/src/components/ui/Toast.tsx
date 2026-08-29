/**
 * Toast — ADMIN-PANEL-SPEC.md § A01 "Accessibility & Trust Signals":
 * "Every save action: visible toast confirmation ('সংরক্ষিত হয়েছে ✅')".
 * Lightweight, no external dependency. Mounted at the layout root via
 * a small provider so any screen can `useToast().push(...)`.
 */
'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'info';
type ToastEntry = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  push: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be rendered within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const push = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const VARIANT: Record<ToastVariant, string> = {
    success: 'bg-life-600',
    error: 'bg-emergency-600',
    info: 'bg-brand-600',
  };

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[900] flex w-[320px] max-w-[90vw] flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center justify-between rounded-lg ${VARIANT[t.variant]} px-4 py-3 text-[14px] font-medium text-white shadow-lg animate-fade-in`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              aria-label="বন্ধ করুন"
              className="ml-3 shrink-0 rounded px-1 text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}