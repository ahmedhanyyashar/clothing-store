import type { ReactNode } from "react"

import { Container } from "@/components/layout/Container"

/** The frame of a legal page: a title, the date it applies from, and readable prose. */
export function LegalPage({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        In force from 1 November 2026
      </p>
      <div className="mt-8 space-y-4 leading-7 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left">
        {children}
      </div>
    </Container>
  )
}
