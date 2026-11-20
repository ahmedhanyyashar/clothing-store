import { tool, type ToolSet } from "ai"
import { z } from "zod"

import {
  cartItemSchema,
  MAX_QUANTITY,
} from "@/lib/cart/model"
import { formatPrice } from "@/lib/catalog/format"
import {
  getBestSellers,
  getLatestProducts,
  getProduct,
  listProducts,
  type ProductSummary,
} from "@/lib/catalog/queries"
import { SORTS } from "@/lib/catalog/search-params"
import {
  CATEGORIES,
  PRODUCT_TYPES,
} from "@/lib/catalog/taxonomy"
import { getOrder, listOrders } from "@/lib/orders/queries"

const card = (product: ProductSummary) => ({
  id: product.id,
  name: product.name,
  price: formatPrice(product.priceCents),
  category: product.category,
  type: product.type,
  inStock: product.inStock,
  imageUrl: product.imageUrl,
})

const catalogTools = {
  searchProducts: tool({
    description:
      "Search the catalog by name and/or category and type. Returns up to 12 matching products.",
    inputSchema: z.object({
      query: z.string().max(100).optional(),
      categories: z.array(z.enum(CATEGORIES)).optional(),
      types: z.array(z.enum(PRODUCT_TYPES)).optional(),
      sort: z.enum(SORTS).optional(),
    }),
    execute: async ({ query, categories, types, sort }) => {
      const { items } = await listProducts({
        q: query?.trim() ?? "",
        categories: categories ?? [],
        types: types ?? [],
        sort: sort ?? "newest",
        page: 1,
      })
      return items.map(card)
    },
  }),
  getProductDetails: tool({
    description:
      "Details of one product by id: description, sizes with stock, colors. Call it before adding to the cart, to learn the size labels.",
    inputSchema: z.object({
      productId: z.string().max(64),
    }),
    execute: async ({ productId }) => {
      const product = await getProduct(productId)
      if (!product) return { found: false as const }
      return {
        found: true as const,
        id: product.id,
        name: product.name,
        description: product.description,
        price: formatPrice(product.priceCents),
        category: product.category,
        type: product.type,
        imageUrl: product.images[0]?.url ?? null,
        sizes: product.sizes,
        colors: product.colors.map((color) => color.name),
      }
    },
  }),
  getBestSellers: tool({
    description: "The store's best sellers.",
    inputSchema: z.object({}),
    execute: async () => (await getBestSellers()).map(card),
  }),
  getLatestProducts: tool({
    description: "The newest products.",
    inputSchema: z.object({}),
    execute: async () =>
      (await getLatestProducts()).map(card),
  }),
}

const cartItemWithQuantity = cartItemSchema.extend({
  quantity: z.int().min(1).max(MAX_QUANTITY),
})

// The cart lives in the browser (decision 25), so these have no `execute`: the
// widget runs them there and sends the result back.
export const cartTools = {
  addToCart: tool({
    description:
      "Add a product in one size to the shopper's cart. The size must be a label from getProductDetails.",
    inputSchema: cartItemWithQuantity,
  }),
  setCartQuantity: tool({
    description:
      "Set the quantity of a line already in the cart.",
    inputSchema: cartItemWithQuantity,
  }),
  removeFromCart: tool({
    description: "Remove a line from the cart.",
    inputSchema: cartItemSchema,
  }),
  viewCart: tool({
    description: "What the cart holds now, with prices.",
    inputSchema: z.object({}),
  }),
}

/** Only status, items and totals: never an address or an email. */
export function orderTools(userId: string) {
  return {
    listMyOrders: tool({
      description:
        "The signed-in shopper's orders, newest first.",
      inputSchema: z.object({}),
      execute: async () =>
        (await listOrders(userId)).map((order) => ({
          number: order.number,
          status: order.status,
          total: formatPrice(order.totalCents),
          placedAt: order.placedAt.toISOString(),
          items: order.items.map(
            (item) => `${item.quantity} x ${item.name}`
          ),
        })),
    }),
    getOrderStatus: tool({
      description:
        "Status and totals of one of the shopper's orders, by order number.",
      inputSchema: z.object({ number: z.string().max(32) }),
      execute: async ({ number }) => {
        const order = await getOrder(userId, number)
        if (!order) return { found: false as const }
        return {
          found: true as const,
          number: order.number,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          subtotal: formatPrice(order.subtotalCents),
          shipping: formatPrice(order.shippingCents),
          total: formatPrice(order.totalCents),
          placedAt: order.placedAt.toISOString(),
          cancelledAt:
            order.cancelledAt?.toISOString() ?? null,
          items: order.items.map((item) => ({
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            unitPrice: formatPrice(item.unitPriceCents),
          })),
        }
      },
    }),
  }
}

/** Order tools exist only for a signed-in shopper, and only for their orders. */
export function assistantTools(userId: string | null) {
  return {
    ...catalogTools,
    ...cartTools,
    ...(userId ? orderTools(userId) : {}),
  } satisfies ToolSet
}
