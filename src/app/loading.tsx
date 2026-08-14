export default function RootLoading() {
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
