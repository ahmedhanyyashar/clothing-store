import { SectionNav } from "@/components/layout/SectionNav"

const SECTIONS = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/settings", label: "Settings" },
] as const

export function AccountNav() {
  return <SectionNav label="Account" sections={SECTIONS} />
}
