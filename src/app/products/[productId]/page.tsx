import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cache } from "react"

import { ProductGallery } from "@/components/catalog/ProductGallery"
import { ProductInfo } from "@/components/catalog/ProductInfo"
import { Container } from "@/components/layout/Container"
import { getProduct } from "@/lib/catalog/queries"

// the page and its metadata both need the product, so ask the database once
const loadProduct = cache(getProduct)

type Props = { params: Promise<{ productId: string }> }

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { productId } = await params
  const product = await loadProduct(productId)
  return product
    ? {
        title: product.name,
        description: product.description,
      }
    : {}
}

export default async function ProductPage({
  params,
}: Props) {
  const { productId } = await params
  const product = await loadProduct(productId)
  if (!product) notFound()

  return (
    <Container className="py-12">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/shop" className="hover:underline">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li
            aria-current="page"
            className="text-foreground"
          >
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery
          images={product.images}
          name={product.name}
        />
        <ProductInfo product={product} />
      </div>
    </Container>
  )
}
