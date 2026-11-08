import { getSessionCookie } from "better-auth/cookies"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { env } from "@/env"
import { buildCsp } from "@/lib/csp"
import { publicBase } from "@/lib/storage/public-base"

const protectedRoutes = ["/account", "/checkout", "/admin"]
const authRoutes = ["/sign-in", "/sign-up"]

const photoOrigin = new URL(
  publicBase({
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT_URL,
    publicUrl: env.S3_PUBLIC_URL,
  })
).origin

// Gives every page its own Content-Security-Policy, and sends signed-out
// visitors away from the private areas. The redirect only checks that a session
// cookie exists, to save a round trip; it does not prove the session is valid,
// so pages and actions still call requireUser().
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = Boolean(getSessionCookie(request))

  if (!hasSession && matches(protectedRoutes, pathname)) {
    const signIn = new URL("/sign-in", request.url)
    signIn.searchParams.set("redirect", pathname + search)
    return NextResponse.redirect(signIn)
  }

  if (hasSession && matches(authRoutes, pathname)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // a fresh nonce for each response; the page reads it back from x-nonce
  const nonce = btoa(crypto.randomUUID())
  const csp = buildCsp({
    nonce,
    dev: process.env.NODE_ENV === "development",
    photoOrigin,
    analytics: Boolean(env.NEXT_PUBLIC_GA_ID),
  })
  const headers = new Headers(request.headers)
  headers.set("x-nonce", nonce)
  headers.set("Content-Security-Policy", csp)
  const response = NextResponse.next({
    request: { headers },
  })
  response.headers.set("Content-Security-Policy", csp)
  return response
}

function matches(routes: string[], pathname: string) {
  return routes.some(
    (route) =>
      pathname === route || pathname.startsWith(`${route}/`)
  )
}

export const config = {
  // every page; not the API, the framework's files or images
  matcher: [
    {
      source:
        "/((?!api/|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
      ],
    },
  ],
}
