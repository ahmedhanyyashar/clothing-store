import type { Route } from "next"
import {
  createSearchParamsCache,
  createSerializer,
  parseAsArrayOf,
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
 * How the shop's URL is read, for example `?category=men,women&type=jeans`.
 * The server page and the client-side filters use these same parsers, so a
 * link and the controls always agree. A value that is not one of the known
 * ones is dropped instead of failing the request.
 */
export const shopParsers = {
  category: parseAsArrayOf(
    parseAsStringLiteral(
      CATEGORIES.map(
        (category) => CATEGORY_INFO[category].slug
      )
    )
  ).withDefault([]),
  type: parseAsArrayOf(
    parseAsStringLiteral(
      PRODUCT_TYPES.map((type) => TYPE_INFO[type].slug)
    )
  ).withDefault([]),
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(SORTS).withDefault("newest"),
  page: parseAsInteger.withDefault(1),
}

export const shopSearchParams =
  createSearchParamsCache(shopParsers)

export type ShopQuery = {
  categories: Category[]
  types: ProductType[]
  q: string
  sort: Sort
  page: number
}

/** Turns what the parsers produced into the query the database layer takes. */
export function toShopQuery(params: {
  category: string[]
  type: string[]
  q: string
  sort: Sort
  page: number
}): ShopQuery {
  return {
    categories: params.category.flatMap(
      (slug) => categoryFromSlug(slug) ?? []
    ),
    types: params.type.flatMap(
      (slug) => typeFromSlug(slug) ?? []
    ),
    q: params.q.trim(),
    sort: params.sort,
    page: Math.max(1, params.page),
  }
}

const serialize = createSerializer(shopParsers)

/** The URL of a shop view. Values equal to their default are left out. */
export function shopHref(
  values: Partial<{
    category: string[]
    type: string[]
    q: string
    sort: Sort
    page: number
  }> = {}
) {
  return serialize("/shop", values) as Route
}
