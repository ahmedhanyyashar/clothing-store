import { loadCartProducts } from "@/lib/cart/actions"
import {
  cartItemSchema,
  cartLineSchema,
  lineKey,
} from "@/lib/cart/model"
import { useCartStore } from "@/lib/cart/store"
import { buildCart } from "@/lib/cart/summary"
import { formatPrice } from "@/lib/catalog/format"

/** The cart tools the model may call; they run here, in the browser. */
export const CART_TOOLS = [
  "addToCart",
  "setCartQuantity",
  "removeFromCart",
  "viewCart",
] as const

export type CartToolName = (typeof CART_TOOLS)[number]

/** A failure the model should hear about, in words it can pass on. */
export class CartToolError extends Error {}

async function stockOf(item: {
  productId: string
  size: string
}) {
  const [product] = await loadCartProducts([item])
  if (!product || product.stock < 1) {
    throw new CartToolError("That size is not available.")
  }
  return product.stock
}

/**
 * Changes the cart the way the shopper's own buttons do, with the stock read
 * fresh from the server. The input comes from the model, so it is validated.
 */
export async function runCartTool(
  name: CartToolName,
  input: unknown
) {
  const cart = useCartStore.getState()

  switch (name) {
    case "addToCart": {
      const { quantity, ...item } =
        cartLineSchema.parse(input)
      const stock = await stockOf(item)
      const added = cart.add(item, quantity, stock)
      return { added, stock }
    }
    case "setCartQuantity": {
      const { quantity, ...item } =
        cartLineSchema.parse(input)
      const inCart = cart.lines.some(
        (line) => lineKey(line) === lineKey(item)
      )
      if (!inCart) {
        throw new CartToolError(
          "That item is not in the cart."
        )
      }
      const stock = await stockOf(item)
      cart.setQuantity(item, Math.min(quantity, stock))
      return { quantity: Math.min(quantity, stock), stock }
    }
    case "removeFromCart": {
      cart.remove(cartItemSchema.parse(input))
      return { removed: true }
    }
    case "viewCart": {
      const lines = cart.lines
      const products = await loadCartProducts(
        lines.map(({ productId, size }) => ({
          productId,
          size,
        }))
      )
      const { rows, subtotalCents } = buildCart(
        lines,
        products,
        true
      )
      return {
        lines: rows.map((row) => ({
          name: row.product?.name ?? "Unavailable product",
          size: row.line.size,
          quantity: row.quantity,
          status: row.status,
        })),
        subtotal: formatPrice(subtotalCents),
      }
    }
  }
}
