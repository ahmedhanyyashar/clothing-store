"use client"

import { useEffect } from "react"

import { authClient } from "@/lib/auth/client"
import { useCartStore } from "@/lib/cart/store"

// The cart is kept in the browser, which every account on this machine shares.
// This tells the store who is signed in, and the store empties the cart when
// the person changes.
export function CartSession() {
  const { data, isPending, error } = authClient.useSession()
  const setUser = useCartStore((state) => state.setUser)
  const userId = data?.user.id ?? null

  useEffect(() => {
    // a failed request says nothing about who is signed in, so it must not
    // be taken for a sign-out
    if (isPending || error) return
    setUser(userId)
  }, [isPending, error, userId, setUser])

  return null
}
