"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  // Both icons are always rendered and CSS picks one, so the server and the
  // first client render match and nothing flashes while the theme resolves.
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() =>
        setTheme(
          resolvedTheme === "dark" ? "light" : "dark"
        )
      }
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  )
}
