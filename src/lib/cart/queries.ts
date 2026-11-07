import { prisma } from "@/lib/db/client"

import type { CartItem, CartProduct } from "./model"

/**
 * The current name, price, image and stock for each product-and-size pair.
 * A pair that no longer exists is simply absent from the result.
 */
export async function getCartProducts(
  items: CartItem[]
): Promise<CartProduct[]> {
  if (items.length === 0) return []

  const rows = await prisma.productSize.findMany({
    where: {
      OR: items.map((item) => ({
        productId: item.productId,
        label: item.size,
      })),
    },
    select: {
      label: true,
      stock: true,
      product: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  })

  return rows.map((row) => ({
    productId: row.product.id,
    size: row.label,
    name: row.product.name,
    priceCents: row.product.priceCents,
    imageUrl: row.product.images[0]?.url ?? null,
    stock: row.stock,
  }))
}
