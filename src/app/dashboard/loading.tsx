// Next.js renders this automatically — via an implicit Suspense boundary
// around the route segment — for the entire window between navigating to
// /dashboard and that route actually being ready to paint. That window
// includes React hydration AND, in dev mode, the on-demand webpack compile
// of this route the first time it's visited (which the terminal logs showed
// taking 15-25s+) — exactly the gap where clicks were landing on a page that
// looked ready but had no attached event handlers yet.
export default function DashboardLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-400/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading Lendiq…</p>
      </div>
    </div>
  );
}
