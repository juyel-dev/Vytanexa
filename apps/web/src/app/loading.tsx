/**
 * Global Loading Skeleton — shown during segment transitions
 * (App Router: src/app/loading.tsx). Lightweight, no data-fetch
 * dependency, avoids empty white screen. Spec's S01 "Skeleton before
 * content — every async list/card shows skeleton first" — this is the
 * route-level complement to the per-card skeletons that already exist
 * (DoctorCard etc. aren't skeletonized here because they are data-
 * dependent; this shell covers the chrome + topbar gap).
 */
export default function Loading() {
  return (
    <div className="animate-pulse px-4 py-6">
      <div className="h-6 w-32 rounded bg-neutral-200" />
      <div className="mt-4 space-y-3">
        <div className="h-24 rounded-xl bg-neutral-100" />
        <div className="h-24 rounded-xl bg-neutral-100" />
        <div className="h-24 rounded-xl bg-neutral-100" />
      </div>
    </div>
  );
}
