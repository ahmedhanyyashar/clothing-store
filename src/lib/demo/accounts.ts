/** Everything that belongs to the demo shop has an address on this domain. */
export const DEMO_DOMAIN = "@clothing-store.example"
export const DEMO_ADMIN_EMAIL = `demo-admin${DEMO_DOMAIN}`
export const DEMO_CUSTOMER_EMAIL = `demo${DEMO_DOMAIN}`

export type DemoKind = "customer" | "admin"

export const DEMO_EMAIL: Record<DemoKind, string> = {
  customer: DEMO_CUSTOMER_EMAIL,
  admin: DEMO_ADMIN_EMAIL,
}

export const isDemoKind = (
  value: unknown
): value is DemoKind =>
  value === "customer" || value === "admin"
