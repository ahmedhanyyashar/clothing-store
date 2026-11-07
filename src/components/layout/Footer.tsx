import { Container } from "@/components/layout/Container"

export function Footer() {
  return (
    <footer className="border-t border-border py-8 text-sm text-muted-foreground">
      <Container>
        &copy; {new Date().getFullYear()} Clothing Store
      </Container>
    </footer>
  )
}
