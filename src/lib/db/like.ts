/**
 * Prisma's `contains` becomes a LIKE pattern, where `%` and `_` are wildcards.
 * Escaping `\`, `%` and `_` makes a search for "100%" look for those
 * characters instead of matching everything.
 */
export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&")
}
