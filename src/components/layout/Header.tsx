import Link from "next/link"

import { Container } from "@/components/layout/Container"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

export function Header() {
  return (
    <header className="border-b border-border">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight"
        >
          Clothing Store
        </Link>
        <ThemeToggle />
      </Container>
    </header>
  )
}
