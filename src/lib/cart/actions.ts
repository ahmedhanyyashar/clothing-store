"use server"

import { z } from "zod"

import { cartItemSchema, MAX_LINES } from "./model"
import { getCartProducts } from "./queries"

const inputSchema = z.array(cartItemSchema).max(MAX_LINES)

/**
 * Looks up the products in a cart. It is public on purpose: it returns only
 * what the shop pages already show, for ids the caller names. The shopper's
 * cart itself never leaves the browser until checkout.
 */
export async function loadCartProducts(items: unknown) {
  return getCartProducts(inputSchema.parse(items))
}
