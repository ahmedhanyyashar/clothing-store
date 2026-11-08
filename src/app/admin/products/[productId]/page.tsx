import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"

import { DeleteProduct } from "@/components/admin/DeleteProduct"
import { ProductForm } from "@/components/admin/ProductForm"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAdminProduct } from "@/lib/admin/product-queries"
import {
  priceText,
  type ProductInput,
} from "@/lib/admin/product-validations"
import { requireRole } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Edit product" }

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  await requireRole("ADMIN", `/admin/products/${productId}`)

  const product = await getAdminProduct(productId)
  if (!product) notFound()

  const values: ProductInput = {
    name: product.name,
    description: product.description,
    price: priceText(product.priceCents),
    category: product.category,
    type: product.type,
    bestSeller: product.bestSeller,
    // each size remembers the stock it had when the page loaded
    sizes: product.sizes.map((size) => ({
      label: size.label,
      stock: size.stock,
      expectedStock: size.stock,
    })),
    colors: product.colors.map(({ name, hex }) => ({
      name,
      hex,
    })),
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Edit {product.name}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {product.images.length > 0 && (
            <ul
              className="flex flex-wrap gap-2"
              aria-label="Photos"
            >
              {product.images.map((image) => (
                <li
                  key={image.id}
                  className="relative h-20 w-16 overflow-hidden rounded bg-muted"
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
          <ProductForm id={product.id} product={values} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Delete</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteProduct
            id={product.id}
            name={product.name}
          />
        </CardContent>
      </Card>
    </>
  )
}
