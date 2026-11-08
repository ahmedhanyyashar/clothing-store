export type SortDirection = "asc" | "desc"

export type Sort<Key extends string> = {
  key: Key
  dir: SortDirection
}

/**
 * Reads `?sort=` and `?dir=` from an address. Only a column in `allowed` is
 * accepted, so what reaches the database is never what the visitor typed;
 * anything else falls back to the table's default order.
 */
export function parseSort<Key extends string>(
  raw: { sort?: string; dir?: string },
  allowed: readonly Key[],
  fallback: Sort<Key>
): Sort<Key> {
  const key = allowed.find((k) => k === raw.sort)
  if (!key) return fallback
  const dir: SortDirection =
    raw.dir === "asc" || raw.dir === "desc"
      ? raw.dir
      : key === fallback.key
        ? fallback.dir
        : "asc"
  return { key, dir }
}

/** The order a click on `key`'s heading asks for: the other way round if it is the current column. */
export function nextDirection<Key extends string>(
  current: Sort<Key>,
  key: Key
): SortDirection {
  if (current.key !== key) return "asc"
  return current.dir === "asc" ? "desc" : "asc"
}
