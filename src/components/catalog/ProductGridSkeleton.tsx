export function ProductGridSkeleton({
  count = 8,
}: {
  count?: number
}) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-border"
        >
          <div className="aspect-4/5 animate-pulse bg-muted" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
