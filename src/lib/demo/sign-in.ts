import { env } from "@/env"
import { auth } from "@/lib/auth/auth"

import { DEMO_EMAIL, type DemoKind } from "./accounts"

export type DemoSignIn =
  { ok: true } | { ok: false; message: string }

/** Whether this server offers the demo accounts at all. */
export const demoAvailable = (config: {
  DEMO_MODE?: boolean
  DEMO_PASSWORD?: string
}) => Boolean(config.DEMO_MODE && config.DEMO_PASSWORD)

/**
 * Signs the visitor in as a demo account. The password comes from the server's
 * environment and never reaches the browser, and nothing here accepts an email
 * address from the visitor: only which of the two demo accounts they want.
 */
export async function signInAsDemo(
  kind: DemoKind,
  headers: Headers,
  config: {
    DEMO_MODE?: boolean
    DEMO_PASSWORD?: string
  } = env
): Promise<DemoSignIn> {
  if (!demoAvailable(config) || !config.DEMO_PASSWORD)
    return {
      ok: false,
      message: "Demo accounts are not available.",
    }

  try {
    await auth.api.signInEmail({
      body: {
        email: DEMO_EMAIL[kind],
        password: config.DEMO_PASSWORD,
      },
      headers,
    })
    return { ok: true }
  } catch {
    return {
      ok: false,
      message:
        "The demo account could not be opened. Try again, or sign in with your own account.",
    }
  }
}
