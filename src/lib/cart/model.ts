import { z } from "zod"

/** The most of one product in one size that a cart line can hold. */
export const MAX_QUANTITY = 10
/** The most lines a cart can hold. */
export const MAX_LINES = 50

export const cartItemSchema = z.object({
  productId: z.string().min(1).max(64),
  size: z.string().min(1).max(32),
})

export const cartLineSchema = cartItemSchema.extend({
  quantity: z.int().min(1).max(MAX_QUANTITY),
})

/** A product in one size: what a cart line is about. */
export type CartItem = z.infer<typeof cartItemSchema>

/**
 * What the browser remembers about a line. It holds no name, image or price:
 * those are read from the server whenever the cart is shown, so they can never
 * be stale or edited by the shopper.
 */
export type CartLine = z.infer<typeof cartLineSchema>

/** A product's current details, as the server knows them. */
export type CartProduct = CartItem & {
  name: string
  priceCents: number
  imageUrl: string | null
  stock: number
}

// A product id never contains "|", so the key is unambiguous.
export function lineKey(item: CartItem) {
  return `${item.productId}|${item.size}`
}
