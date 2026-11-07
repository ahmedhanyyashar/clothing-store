import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="grid items-center gap-12 py-12 lg:grid-cols-2 lg:py-20">
      <div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Everyday style, made to last
        </h1>
        <p className="mt-6 max-w-prose text-lg leading-8 text-muted-foreground">
          Timeless essentials for men, women and children in
          honest fabrics, from the softest tee to the jacket
          you will reach for every day.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/shop">Shop the collection</Link>
        </Button>
      </div>

      <div className="relative aspect-4/5 w-full max-w-md justify-self-center overflow-hidden rounded-3xl bg-muted lg:max-w-none">
        <Image
          src="/products/rust-bomber-jacket.webp"
          alt="A rust-colored bomber jacket on a hanger"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  )
}
