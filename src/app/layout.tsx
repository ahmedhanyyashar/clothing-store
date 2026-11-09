import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { Poppins } from "next/font/google"
import { headers } from "next/headers"
import { NuqsAdapter } from "nuqs/adapters/next/app"

import "./globals.css"

import { CartSession } from "@/components/cart/CartSession"
import { Analytics } from "@/components/consent/Analytics"
import { ConsentBanner } from "@/components/consent/ConsentBanner"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { Toaster } from "@/components/ui/sonner"
import { env } from "@/env"

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  // makes every relative canonical and social-image URL absolute
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Clothing Store",
    template: "%s | Clothing Store",
  },
  description:
    "Shop men's, women's and kids' clothing: tees, shirts, jeans, jackets, hoodies and sneakers.",
  openGraph: {
    siteName: "Clothing Store",
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // each response has its own Content-Security-Policy nonce (see proxy.ts); reading
  // it also makes every page render per request, which a nonce requires
  const nonce =
    (await headers()).get("x-nonce") ?? undefined

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
          nonce={nonce}
        >
          <NuqsAdapter>
            <CartSession />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster />
            <ConsentBanner />
            <Analytics
              id={env.NEXT_PUBLIC_GA_ID}
              nonce={nonce}
            />
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  )
}
