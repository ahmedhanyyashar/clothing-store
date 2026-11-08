"use client"

import { useTheme } from "next-themes"
import {
  Toaster as Sonner,
  type ToasterProps,
} from "sonner"

/** The app's one place for toasts: short confirmations of what just happened. */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      closeButton
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
