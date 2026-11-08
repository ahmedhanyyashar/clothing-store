import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"
import { escapeLike } from "@/lib/db/like"

import type { Sort } from "./sorting"

export const ADMIN_PRODUCTS_PAGE_SIZE = 20

/** The columns the product list can be sorted by, and the order it starts in. */
export const PRODUCT_SORTS = [
  "name",
  "category",
  "price",
  "created",
] as const
export type ProductSort = Sort<
  (typeof PRODUCT_SORTS)[number]
>
export const DEFAULT_PRODUCT_SORT: ProductSort = {
  key: "created",
  dir: "desc",
}

function productOrder({
  key,
  dir,
}: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
  // the id breaks ties, so a product never appears on two pages or on none
  const tie = { id: "asc" } as const
  switch (key) {
    case "name":
      return [{ name: dir }, tie]
    case "category":
      return [{ category: dir }, { type: dir }, tie]
    case "price":
      return [{ priceCents: dir }, tie]
    case "created":
      return [{ createdAt: dir }, tie]
  }
}

/** The shop's products for the admin list: newest first, 20 to a page, searchable by name. */
export async function listAdminProducts({
  q,
  page,
  sort = DEFAULT_PRODUCT_SORT,
}: {
  q?: string
  page: number
  sort?: ProductSort
}) {
  const text = q?.trim()
  const where = text
    ? {
        name: {
          contains: escapeLike(text),
          mode: "insensitive" as const,
        },
      }
    : {}

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: productOrder(sort),
      skip: (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE,
      take: ADMIN_PRODUCTS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        priceCents: true,
        category: true,
        type: true,
        bestSeller: true,
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { url: true },
        },
        sizes: { select: { stock: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return {
    products,
    total,
    page,
    pageCount: Math.max(
      1,
      Math.ceil(total / ADMIN_PRODUCTS_PAGE_SIZE)
    ),
  }
}

/** A product with everything the edit form needs. */
export function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { position: "asc" },
        select: { id: true, url: true },
      },
      sizes: { orderBy: { position: "asc" } },
      colors: { orderBy: { id: "asc" } },
    },
  })
}
