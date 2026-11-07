import Link from "next/link"

import { CartButton } from "@/components/cart/CartButton"
import { Container } from "@/components/layout/Container"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { UserMenu } from "@/components/layout/UserMenu"

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
        <nav aria-label="Main" className="mr-auto ml-8">
          <Link
            href="/shop"
            className="text-sm font-medium hover:underline"
          >
            Shop
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu />
          <CartButton />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  )
}
