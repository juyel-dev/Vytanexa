export default function AdminRoot() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
        V
      </div>
      <h1 className="text-admin-h1 text-neutral-900">Vytanexa Admin</h1>
      <p className="text-admin-body text-neutral-500">
        Phase 0 scaffold — see IMPLEMENTATION-ROADMAP.md (Phase 4: Admin
        Panel Core)
      </p>
    </main>
  );
}
