/**
 * Dashboard Loading — TODO.md Phase 8.6 / DEEPDIVE-REFACTOR-PLAN.md H4.
 * Placed at the `(dashboard)/` route-group level so Next's layout-scoped
 * boundary inheritance covers all 33 dashboard routes with this one
 * file — sidebar/TopBar chrome (rendered by the layout, outside
 * `{children}`) stays visible, only the `<main>` content area shows
 * this skeleton while a route's Server Component data-fetch is in
 * flight. Before this, every navigation to a slower query
 * (analytics, audit log, leads with its extra joins) showed a blank
 * white flash instead.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-40 rounded bg-neutral-200" />
      <div className="mt-2 h-4 w-64 rounded bg-neutral-100" />
      <div className="mt-6 overflow-hidden rounded-xl border border-admin-border bg-white">
        <div className="h-10 border-b border-admin-border bg-neutral-50" />
        <div className="divide-y divide-admin-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
