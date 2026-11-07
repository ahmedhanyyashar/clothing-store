import { Container } from "@/components/layout/Container"

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Container className="flex justify-center py-16">
      {children}
    </Container>
  )
}
