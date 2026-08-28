import { create } from 'zustand';

/**
 * UI Store — S22 Zustand stores (onboarding, filters, ui state).
 * Lightweight global UI state that doesn't belong in URL searchParams
 * (per the architecture summary: URL params are for shareable list/
 * filter state, Zustand for cross-page client state). This store holds
 * ephemeral chrome state — toast queue and the deferred PWA install
 * prompt captured at the top level (mirrors Home SEC-13's PwaInstallBanner
 * logic but lifted here so any surface can trigger the install flow).
 */
type Toast = { id: string; message: string; type?: 'success' | 'error' | 'info' };

type UiState = {
  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  // PWA install prompt — captured once globally, replayed on user tap
  deferredPrompt: Event | null;
  setDeferredPrompt: (e: Event | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (t) =>
    set((s) => ({
      toasts: [...s.toasts, { ...t, id: `${Date.now()}-${Math.random()}` }],
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  deferredPrompt: null,
  setDeferredPrompt: (e) => set({ deferredPrompt: e }),
}));
