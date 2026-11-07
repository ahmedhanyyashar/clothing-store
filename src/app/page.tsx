import { connection } from "next/server"
import { Suspense } from "react"

import { ProductGridSkeleton } from "@/components/catalog/ProductGridSkeleton"
import { ProductSection } from "@/components/catalog/ProductSection"
import { Hero } from "@/components/home/Hero"
import { Container } from "@/components/layout/Container"
import {
  getBestSellers,
  getLatestProducts,
} from "@/lib/catalog/queries"

export default async function HomePage() {
  // reads the database, so it must render per request and never at build time
  await connection()

  return (
    <Container>
      <Hero />

      {/* each row streams in on its own, so a slow query never blocks the page */}
      <Suspense
        fallback={<ProductGridSkeleton count={4} />}
      >
        <BestSellers />
      </Suspense>
      <Suspense
        fallback={<ProductGridSkeleton count={4} />}
      >
        <LatestArrivals />
      </Suspense>
    </Container>
  )
}

async function BestSellers() {
  const products = await getBestSellers()
  if (products.length === 0) return null

  return (
    <ProductSection
      title="Best sellers"
      description="The pieces our customers come back for."
      products={products}
    />
  )
}

async function LatestArrivals() {
  const products = await getLatestProducts(4)
  if (products.length === 0) return null

  return (
    <ProductSection
      title="Latest arrivals"
      description="Just in: the newest additions to the collection."
      products={products}
    />
  )
}
