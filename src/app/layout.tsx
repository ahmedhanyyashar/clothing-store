import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Clothing Store",
    template: "%s | Clothing Store",
  },
  description: "An online clothing store.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
