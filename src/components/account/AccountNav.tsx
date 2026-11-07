"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const SECTIONS = [
  { href: "/account", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/security", label: "Security" },
] as const satisfies readonly {
  href: Route
  label: string
}[]

export function AccountNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Account">
      <ul className="flex gap-2 md:flex-col">
        {SECTIONS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={
                pathname === href ? "page" : undefined
              }
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                pathname === href && "bg-accent"
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
