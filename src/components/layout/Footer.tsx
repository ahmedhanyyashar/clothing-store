import Link from "next/link"

import { CookieSettings } from "@/components/consent/CookieSettings"
import { Container } from "@/components/layout/Container"

export function Footer() {
  return (
    <footer className="border-t border-border py-8 text-sm text-muted-foreground">
      <Container className="flex flex-wrap items-center justify-between gap-4">
        <span>
          &copy; {new Date().getFullYear()} Clothing Store
        </span>
        <nav
          aria-label="Legal"
          className="flex flex-wrap gap-4"
        >
          <Link
            href="/privacy"
            className="underline underline-offset-4"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="underline underline-offset-4"
          >
            Terms
          </Link>
          <Link
            href="/cookies"
            className="underline underline-offset-4"
          >
            Cookies
          </Link>
          <CookieSettings />
        </nav>
      </Container>
    </footer>
  )
}
