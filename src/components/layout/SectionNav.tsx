"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export type Section = { href: Route; label: string }

/**
 * Is `href` the section being viewed? A top-level section such as /account is
 * only itself; a deeper one such as /account/orders also covers its pages
 * (/account/orders/CS-...), so the menu keeps showing where you are.
 */
export function isCurrent(pathname: string, href: string) {
  const topLevel = href.split("/").length === 2
  return (
    pathname === href ||
    (!topLevel && pathname.startsWith(`${href}/`))
  )
}

/** The menu of an area of the site with several pages (account, admin). */
export function SectionNav({
  label,
  sections,
}: {
  label: string
  sections: readonly Section[]
}) {
  const pathname = usePathname()

  return (
    <nav aria-label={label}>
      <ul className="flex gap-2 md:flex-col">
        {sections.map(({ href, label }) => {
          const current = isCurrent(pathname, href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                  current && "bg-accent"
                )}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
