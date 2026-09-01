'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * TODO.md Phase 8.1's deferred sub-item, finished here. `TopBarHome`
 * renders on ~21 different page.tsx call sites with zero props
 * (each just renders `<TopBarHome />`) — threading a `logoUrl` prop
 * through all 21 would have been the invasive, error-prone version of
 * this fix. Instead: `(main)/layout.tsx` (the one shared wrapper for
 * all of them) fetches `app_settings.logo_url` once and provides it
 * here; `TopBarHome` just reads the context. Zero changes needed at
 * any of the 21 call sites.
 */
const LogoContext = createContext<string | null>(null);

export function LogoProvider({ logoUrl, children }: { logoUrl: string | null; children: ReactNode }) {
  return <LogoContext.Provider value={logoUrl}>{children}</LogoContext.Provider>;
}

export function useLogoUrl() {
  return useContext(LogoContext);
}
