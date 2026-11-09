import type { Metadata } from "next"

import { Container } from "@/components/layout/Container"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Container className="flex justify-center py-16">
      {children}
    </Container>
  )
}
