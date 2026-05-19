/**
 * Route-level loading UI for all (main) pages.
 * Next.js shows this instantly while the server component is fetching data,
 * replacing the blank white flash that previously appeared on every navigation.
 */
export default function Loading() {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-6 w-24 rounded-md" />
          <div className="skeleton h-4 w-40 rounded" />
        </div>
        <div className="skeleton h-8 w-20 rounded-md" />
      </div>

      {/* Filter/tab bar */}
      <div className="flex gap-2">
        {[60, 44, 52, 48].map((w, i) => (
          <div key={i} className="skeleton h-7 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Cards */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="skeleton rounded-xl"
          style={{ height: "88px", animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}
