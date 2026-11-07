import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Joins class names and resolves conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns `path` only if it stays on this site, otherwise `fallback`. Use it
 * for any redirect target taken from a query string, so a crafted link cannot
 * send a signed-in user to another site.
 */
export function getSafeRedirect(
  path: string | null | undefined,
  fallback = "/"
) {
  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\")
  ) {
    return fallback
  }
  return path
}
