import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server"

import type {
  Category,
  ProductType,
} from "@/generated/prisma/enums"

import {
  CATEGORIES,
  CATEGORY_INFO,
  categoryFromSlug,
  PRODUCT_TYPES,
  TYPE_INFO,
  typeFromSlug,
} from "./taxonomy"

export const SORTS = [
  "newest",
  "price-asc",
  "price-desc",
] as const
export type Sort = (typeof SORTS)[number]

/**
 * How the shop's URL is read. The server page and the client-side filters use
 * these same parsers, so a link and the controls always agree. A value that is
 * not one of the known ones is dropped instead of failing the request.
 */
export const shopParsers = {
  category: parseAsStringLiteral(
    CATEGORIES.map(
      (category) => CATEGORY_INFO[category].slug
    )
  ),
  type: parseAsStringLiteral(
    PRODUCT_TYPES.map((type) => TYPE_INFO[type].slug)
  ),
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(SORTS).withDefault("newest"),
  page: parseAsInteger.withDefault(1),
}

export const shopSearchParams =
  createSearchParamsCache(shopParsers)

export type ShopQuery = {
  category?: Category
  type?: ProductType
  q: string
  sort: Sort
  page: number
}

/** Turns what the parsers produced into the query the database layer takes. */
export function toShopQuery(params: {
  category: string | null
  type: string | null
  q: string
  sort: Sort
  page: number
}): ShopQuery {
  return {
    category: categoryFromSlug(params.category),
    type: typeFromSlug(params.type),
    q: params.q.trim(),
    sort: params.sort,
    page: Math.max(1, params.page),
  }
}
