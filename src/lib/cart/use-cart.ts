"use client"

import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react"

import { loadCartProducts } from "./actions"
import type { CartProduct } from "./model"
import { useCartStore } from "./store"
import { buildCart } from "./summary"

const subscribe = () => () => {}

/**
 * False while the server renders and during hydration, true after. The cart
 * lives in the browser, so before this the page cannot know what it holds.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

/** Number of items in the cart, read from the browser alone. */
export function useCartCount() {
  const hydrated = useHydrated()
  const count = useCartStore((state) =>
    state.lines.reduce(
      (sum, line) => sum + line.quantity,
      0
    )
  )
  return hydrated ? count : 0
}

type Loaded =
  | { sig: string; products: CartProduct[]; failed: false }
  | { sig: string; products: null; failed: true }

/**
 * The cart with the server's current details: the stored lines say what the
 * shopper wants, the server says what it costs and what is left.
 */
export function useCart() {
  const hydrated = useHydrated()
  const lines = useCartStore((state) => state.lines)
  const [loaded, setLoaded] = useState<Loaded>()
  const [attempt, setAttempt] = useState(0)

  // Details are fetched again only when the set of products changes, not when
  // a quantity does. The previous details stay on screen meanwhile, so
  // removing a line does not blank the others.
  const sig = JSON.stringify(
    lines.map(({ productId, size }) => ({
      productId,
      size,
    }))
  )

  useEffect(() => {
    if (sig === "[]") return
    let stale = false
    loadCartProducts(JSON.parse(sig)).then(
      (products) => {
        if (!stale) {
          setLoaded({ sig, products, failed: false })
        }
      },
      () => {
        if (!stale) {
          setLoaded({ sig, products: null, failed: true })
        }
      }
    )
    return () => {
      stale = true
    }
  }, [sig, attempt])

  const settled = sig === "[]" || loaded?.sig === sig
  const failed =
    loaded?.failed === true && loaded.sig === sig
  const cart = buildCart(
    lines,
    loaded?.products ?? [],
    settled
  )

  return {
    ...cart,
    ready: hydrated,
    failed,
    retry: () => {
      setLoaded(undefined)
      setAttempt((n) => n + 1)
    },
  }
}
