import { SectionNav } from "@/components/layout/SectionNav"

const SECTIONS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/audit", label: "Audit log" },
] as const

export function AdminNav() {
  return <SectionNav label="Admin" sections={SECTIONS} />
}
