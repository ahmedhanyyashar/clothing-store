import { z } from "zod"

import {
  cartLineSchema,
  lineKey,
  MAX_LINES,
} from "@/lib/cart/model"

/** What the browser sends to place an order. Prices are not in it on purpose: the server reads them. */
export const placeOrderSchema = z.object({
  addressId: z.string().min(1).max(64),
  // one value per checkout attempt, made by the browser
  idempotencyKey: z.uuid(),
  paymentMethod: z.enum(["CARD", "CASH_ON_DELIVERY"]),
  items: z
    .array(cartLineSchema)
    .min(1, "Your cart is empty.")
    .max(MAX_LINES)
    .refine(
      (items) =>
        new Set(items.map(lineKey)).size === items.length,
      "A product appears twice."
    ),
})

export type PlaceOrderInput = z.infer<
  typeof placeOrderSchema
>
