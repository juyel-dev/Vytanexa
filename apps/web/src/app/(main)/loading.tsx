/**
 * (main) route group loading — covers Home, Search, Doctors, Hospitals,
 * Symptoms etc. while their Server Components fetch. Mirrors the global
 * skeleton but sized for the list chrome (topbar + bottom nav are outside
 * this segment, so this only skeletons the page body).
 */
export default function Loading() {
  return (
    <div className="animate-pulse px-4 py-4">
      <div className="h-5 w-24 rounded bg-neutral-200" />
      <div className="mt-4 h-10 rounded-lg bg-neutral-100" />
      <div className="mt-4 grid gap-3">
        <div className="h-28 rounded-xl bg-neutral-100" />
        <div className="h-28 rounded-xl bg-neutral-100" />
        <div className="h-28 rounded-xl bg-neutral-100" />
      </div>
    </div>
  );
}
