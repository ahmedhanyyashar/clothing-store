import type { Prisma } from "@/generated/prisma/client"
import type {
  Category,
  ProductType,
} from "@/generated/prisma/enums"
import { prisma } from "@/lib/db/client"

import type { ShopQuery, Sort } from "./search-params"

export const PAGE_SIZE = 12

export type ProductSummary = {
  id: string
  name: string
  priceCents: number
  category: Category
  type: ProductType
  imageUrl: string | null
  inStock: boolean
}

export type ProductDetails = {
  id: string
  name: string
  description: string
  priceCents: number
  category: Category
  type: ProductType
  images: { url: string }[]
  sizes: { label: string; stock: number }[]
  colors: { name: string; hex: string }[]
}

const summarySelect = {
  id: true,
  name: true,
  priceCents: true,
  category: true,
  type: true,
  images: {
    orderBy: { position: "asc" },
    take: 1,
    select: { url: true },
  },
  sizes: { select: { stock: true } },
} satisfies Prisma.ProductSelect

type SummaryRow = Prisma.ProductGetPayload<{
  select: typeof summarySelect
}>

function toSummary(row: SummaryRow): ProductSummary {
  return {
    id: row.id,
    name: row.name,
    priceCents: row.priceCents,
    category: row.category,
    type: row.type,
    imageUrl: row.images[0]?.url ?? null,
    inStock: row.sizes.some((size) => size.stock > 0),
  }
}

// The id breaks ties, so a product never appears on two pages or on none.
const ORDER_BY = {
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  "price-asc": [{ priceCents: "asc" }, { id: "asc" }],
  "price-desc": [{ priceCents: "desc" }, { id: "asc" }],
} satisfies Record<
  Sort,
  Prisma.ProductOrderByWithRelationInput[]
>

// `contains` becomes a LIKE pattern, where % and _ are wildcards. Escaping them
// makes a search for "100%" look for those characters, not match everything.
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&")
}

/** One page of the shop, with the filters, search and sort already applied. */
export async function listProducts(query: ShopQuery) {
  const where: Prisma.ProductWhereInput = {
    category: query.categories.length
      ? { in: query.categories }
      : undefined,
    type: query.types.length
      ? { in: query.types }
      : undefined,
    name: query.q
      ? {
          contains: escapeLike(query.q),
          mode: "insensitive",
        }
      : undefined,
  }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: ORDER_BY[query.sort],
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: summarySelect,
    }),
    prisma.product.count({ where }),
  ])

  return {
    items: rows.map(toSummary),
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

export async function getBestSellers(limit = 4) {
  const rows = await prisma.product.findMany({
    where: { bestSeller: true },
    orderBy: ORDER_BY.newest,
    take: limit,
    select: summarySelect,
  })
  return rows.map(toSummary)
}

export async function getLatestProducts(limit = 8) {
  const rows = await prisma.product.findMany({
    orderBy: ORDER_BY.newest,
    take: limit,
    select: summarySelect,
  })
  return rows.map(toSummary)
}

/** A product with everything the product page needs, or null if there is none. */
export async function getProduct(
  id: string
): Promise<ProductDetails | null> {
  return prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      category: true,
      type: true,
      images: {
        orderBy: { position: "asc" },
        select: { url: true },
      },
      sizes: {
        orderBy: { position: "asc" },
        select: { label: true, stock: true },
      },
      colors: { select: { name: true, hex: true } },
    },
  })
}
