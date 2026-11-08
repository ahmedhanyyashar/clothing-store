import { prisma } from "@/lib/db/client"
import { escapeLike } from "@/lib/db/like"

export const ADMIN_PRODUCTS_PAGE_SIZE = 20

/** The shop's products for the admin list: newest first, 20 to a page, searchable by name. */
export async function listAdminProducts({
  q,
  page,
}: {
  q?: string
  page: number
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
      // the id breaks ties, so a product never appears on two pages or on none
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
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
