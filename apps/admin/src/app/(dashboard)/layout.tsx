import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AdminSidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { getAdminSession } from '@/lib/supabase/auth-verify';
import { getModerationBadgeCounts } from '@/lib/moderation-counts';

// The dashboard depends on the auth-cookie session (getAdminSession) —
// force dynamic so Next never attempts to prerender it (which would
// also hit the missing-env paths in this sandbox's build).
export const dynamic = 'force-dynamic';

/**
 * Dashboard layout — ADMIN-PANEL-SPEC.md § A02 "Route Map":
 * `(dashboard)/layout.tsx` = auth guard + role check + sidebar.
 *
 * Two-layer check (defense in depth, matching the RLS philosophy):
 * (1) here — `getAdminSession()` rejects non-operators at the layout
 *     level so no dashboard content ever renders for them;
 * (2) `requireRole(role)` on every server mutation route — never trusts
 *     the client to have hidden a button correctly.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/login');
  const badgeCounts = await getModerationBadgeCounts();

  return (
    <div className="flex min-h-dvh">
      <AdminSidebar session={session} badgeCounts={badgeCounts} />
      <div className="flex flex-1 flex-col">
        <Suspense fallback={<div className="h-14 border-b border-admin-border bg-white" />}>
          <TopBar session={session} />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}