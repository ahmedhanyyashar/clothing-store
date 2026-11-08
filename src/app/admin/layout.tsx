import { AdminNav } from "@/components/admin/AdminNav"
import { Container } from "@/components/layout/Container"

// No access check here: a layout does not re-render when moving between its
// pages, so every page below calls requireRole itself.
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Admin
      </h1>
      <div className="mt-8 grid gap-8 md:grid-cols-[12rem_1fr]">
        <AdminNav />
        <div className="min-w-0 space-y-8">{children}</div>
      </div>
    </Container>
  )
}
