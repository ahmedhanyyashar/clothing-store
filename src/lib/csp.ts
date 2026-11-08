/**
 * The Content-Security-Policy for one response. Scripts run only if they carry
 * this response's nonce (or were added by one that does), so an injected
 * <script> or inline handler is refused even if some input is ever printed
 * unescaped. Styles allow inline because the framework writes style tags.
 */
export function buildCsp({
  nonce,
  dev = false,
  photoOrigin,
  uploadOrigin,
  analytics = false,
}: {
  nonce: string
  dev?: boolean
  /** Where product photos are served from, if not this site. */
  photoOrigin?: string
  /** Where the browser posts a photo to be stored (the bucket itself). */
  uploadOrigin?: string
  /** Whether the Google Analytics addresses are allowed. */
  analytics?: boolean
}) {
  const ga = analytics
    ? [
        "https://www.googletagmanager.com",
        "https://*.google-analytics.com",
        "https://*.analytics.google.com",
      ]
    : []
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // React's development tools use eval; production does not
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      ...(photoOrigin ? [photoOrigin] : []),
      ...ga,
    ],
    "font-src": ["'self'"],
    // photo uploads go straight to the bucket
    "connect-src": [
      "'self'",
      ...(uploadOrigin ? [uploadOrigin] : []),
      ...ga,
      ...(dev ? ["ws:", "http://localhost:*"] : []),
    ],
    "form-action": [
      "'self'",
      "https://checkout.stripe.com",
      "https://accounts.google.com",
    ],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  }
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ")
}
