import type {
  Category,
  ProductType,
} from "@/generated/prisma/enums"
import { prisma } from "@/lib/db/client"

let counter = 0

/** Creates a product with sensible defaults; override only what a test cares about. */
export async function createProduct(
  overrides: {
    name?: string
    priceCents?: number
    category?: Category
    type?: ProductType
    bestSeller?: boolean
    createdAt?: Date
    images?: string[]
    sizes?: { label: string; stock: number }[]
    colors?: { name: string; hex: string }[]
  } = {}
) {
  counter += 1

  return prisma.product.create({
    data: {
      name: overrides.name ?? `Product ${counter}`,
      description: "A product made for a test.",
      priceCents: overrides.priceCents ?? 1000,
      category: overrides.category ?? "MEN",
      type: overrides.type ?? "T_SHIRTS",
      bestSeller: overrides.bestSeller ?? false,
      createdAt: overrides.createdAt,
      images: {
        create: (
          overrides.images ?? ["/products/test.webp"]
        ).map((url, position) => ({ url, position })),
      },
      sizes: {
        create: (
          overrides.sizes ?? [{ label: "M", stock: 5 }]
        ).map((size, position) => ({ ...size, position })),
      },
      colors: {
        create: overrides.colors ?? [
          { name: "Black", hex: "#000000" },
        ],
      },
    },
  })
}
