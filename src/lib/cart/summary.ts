import {
  lineKey,
  type CartLine,
  type CartProduct,
} from "./model"

export type RowStatus =
  /** the product details have not arrived yet */
  | "loading"
  | "ok"
  /** the shopper wants more than is left, so the quantity is cut to the stock */
  | "limited"
  | "sold-out"
  /** the product or the size no longer exists */
  | "missing"

export type CartRow = {
  key: string
  line: CartLine
  product: CartProduct | null
  status: RowStatus
  /** what will be bought: 0 for a row that cannot be bought */
  quantity: number
  totalCents: number
}

/**
 * Joins the remembered lines with the server's current details. The result is
 * the only place that decides what a cart line is worth, and it only counts
 * what can really be bought right now.
 */
export function buildCart(
  lines: CartLine[],
  products: CartProduct[],
  settled: boolean
) {
  const byKey = new Map(
    products.map((product) => [lineKey(product), product])
  )

  const rows = lines.map((line): CartRow => {
    const key = lineKey(line)
    const product = byKey.get(key) ?? null
    const row = {
      key,
      line,
      product,
      quantity: 0,
      totalCents: 0,
    }

    if (!product) {
      return {
        ...row,
        status: settled ? "missing" : "loading",
      }
    }
    if (product.stock <= 0) {
      return { ...row, status: "sold-out" }
    }

    const quantity = Math.min(line.quantity, product.stock)
    return {
      ...row,
      status: quantity < line.quantity ? "limited" : "ok",
      quantity,
      totalCents: product.priceCents * quantity,
    }
  })

  return {
    rows,
    itemCount: rows.reduce((sum, r) => sum + r.quantity, 0),
    subtotalCents: rows.reduce(
      (sum, r) => sum + r.totalCents,
      0
    ),
  }
}
