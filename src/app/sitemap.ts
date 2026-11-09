import type { MetadataRoute } from "next"
import { connection } from "next/server"

import { env } from "@/env"
import { listProductsForSitemap } from "@/lib/catalog/queries"

const STATIC_PATHS = [
  "/",
  "/shop",
  "/terms",
  "/privacy",
  "/cookies",
]

const absolute = (path: string) =>
  new URL(path, env.NEXT_PUBLIC_APP_URL).href

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // reads the database, so it must render per request and never at build time
  await connection()

  // One file holds at most 50,000 URLs. Past that, split it with
  // generateSitemaps and list the products in chunks.
  const products = await listProductsForSitemap()

  return [
    ...STATIC_PATHS.map((path) => ({
      url: absolute(path),
    })),
    ...products.map((product) => ({
      url: absolute(`/products/${product.id}`),
      lastModified: product.updatedAt,
    })),
  ]
}
