import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { Poppins } from "next/font/google"
import { NuqsAdapter } from "nuqs/adapters/next/app"

import "./globals.css"

import { CartSession } from "@/components/cart/CartSession"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

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
    // next-themes sets the theme class on <html> before hydration
    <html
      lang="en"
      className={poppins.variable}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>
            <CartSession />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  )
}
