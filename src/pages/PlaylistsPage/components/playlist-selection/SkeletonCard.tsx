export function SkeletonCard() {
  return (
    <div className="island-shell feature-card rounded-xl border p-5 animate-pulse">
      <div className="h-4 w-3/5 rounded-md bg-[var(--stroke)] mb-3" />
      <div className="h-3 w-2/5 rounded-md bg-[var(--stroke)]" />
    </div>
  );
}
