"use server"

import { headers } from "next/headers"

import { isDemoKind } from "./accounts"
import { signInAsDemo, type DemoSignIn } from "./sign-in"

/** Signs the visitor in as the demo customer or the demo admin. */
export async function signInAsDemoAction(
  kind: unknown
): Promise<DemoSignIn> {
  if (!isDemoKind(kind))
    return { ok: false, message: "Choose a demo account." }
  return signInAsDemo(kind, await headers())
}
