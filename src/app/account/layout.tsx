import { AccountNav } from "@/components/account/AccountNav"
import { Container } from "@/components/layout/Container"

// No access check here: a layout does not re-render when the shopper moves
// between its pages, so every page below calls requireUser itself.
export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Account
      </h1>
      <div className="mt-8 grid gap-8 md:grid-cols-[12rem_1fr]">
        <AccountNav />
        <div className="max-w-xl space-y-8">{children}</div>
      </div>
    </Container>
  )
}
