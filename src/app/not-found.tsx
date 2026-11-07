import Link from "next/link"

import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
        404
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="max-w-md text-muted-foreground">
        The page you are looking for does not exist or has
        moved.
      </p>
      <Button asChild className="mt-4">
        <Link href="/">Back to home</Link>
      </Button>
    </Container>
  )
}
