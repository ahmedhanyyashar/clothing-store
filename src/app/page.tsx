import { Container } from "@/components/layout/Container"

export default function HomePage() {
  return (
    <Container className="py-16">
      <h1 className="text-4xl font-semibold tracking-tight">
        Clothing Store
      </h1>
      <p className="mt-3 max-w-prose text-muted-foreground">
        Our first collection is on its way.
      </p>
    </Container>
  )
}
