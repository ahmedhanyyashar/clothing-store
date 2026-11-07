import { z } from "zod"
import { create } from "zustand"
import {
  createJSONStorage,
  persist,
} from "zustand/middleware"

import {
  cartLineSchema,
  lineKey,
  MAX_LINES,
  MAX_QUANTITY,
  type CartItem,
  type CartLine,
} from "./model"

const STORAGE_KEY = "cart"

// Anything read back from the browser is untrusted: it may be from an older
// version of the app, or edited by hand. A cart that does not match is dropped.
const persistedSchema = z.object({
  userId: z.string().nullable(),
  lines: z.array(cartLineSchema).max(MAX_LINES),
})

type CartState = {
  /** whose cart this is; null for a visitor who is not signed in */
  userId: string | null
  lines: CartLine[]
}

type CartActions = {
  /** Adds to a line, never beyond `limit` (the stock). Returns how many were added. */
  add: (
    item: CartItem,
    quantity: number,
    limit: number
  ) => number
  setQuantity: (item: CartItem, quantity: number) => void
  remove: (item: CartItem) => void
  clear: () => void
  setUser: (userId: string | null) => void
}

function isSame(a: CartItem, b: CartItem) {
  return lineKey(a) === lineKey(b)
}

function quantityOf(lines: CartLine[], item: CartItem) {
  return (
    lines.find((line) => isSame(line, item))?.quantity ?? 0
  )
}

function clamp(quantity: number, max: number) {
  return Math.min(Math.max(1, Math.trunc(quantity)), max)
}

export const useCartStore = create<
  CartState & CartActions
>()(
  persist(
    (set, get) => ({
      userId: null,
      lines: [],

      add: (item, quantity, limit) => {
        const max = Math.min(limit, MAX_QUANTITY)
        if (max < 1) return 0
        const before = quantityOf(get().lines, item)

        set(({ lines }) => {
          const existing = lines.find((line) =>
            isSame(line, item)
          )
          if (existing) {
            return {
              lines: lines.map((line) =>
                line === existing
                  ? {
                      ...line,
                      quantity: clamp(
                        line.quantity + quantity,
                        max
                      ),
                    }
                  : line
              ),
            }
          }
          if (lines.length >= MAX_LINES) return { lines }
          return {
            lines: [
              ...lines,
              {
                productId: item.productId,
                size: item.size,
                quantity: clamp(quantity, max),
              },
            ],
          }
        })

        return quantityOf(get().lines, item) - before
      },

      setQuantity: (item, quantity) =>
        set(({ lines }) => ({
          lines: lines.map((line) =>
            isSame(line, item)
              ? {
                  ...line,
                  quantity: clamp(quantity, MAX_QUANTITY),
                }
              : line
          ),
        })),

      remove: (item) =>
        set(({ lines }) => ({
          lines: lines.filter(
            (line) => !isSame(line, item)
          ),
        })),

      clear: () => set({ lines: [] }),

      setUser: (userId) =>
        set((state) => {
          if (state.userId === userId) return state
          // A visitor who signs in keeps the cart they filled. Any other change
          // of identity starts empty, so people sharing a browser never see
          // each other's items.
          return state.userId === null
            ? { userId }
            : { userId, lines: [] }
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ userId, lines }) => ({
        userId,
        lines,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted)
        if (!parsed.success) return current

        // keep the first of any repeated line
        const seen = new Set<string>()
        const lines = parsed.data.lines.filter((line) => {
          const key = lineKey(line)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        return {
          ...current,
          userId: parsed.data.userId,
          lines,
        }
      },
    }
  )
)

// Another tab changed the cart: take its version, or this tab would later
// write over it with a stale one.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      void useCartStore.persist.rehydrate()
    }
  })
}
