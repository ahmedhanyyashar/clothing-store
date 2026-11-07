const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

/** Prices are stored as whole cents; this is the only place they become text. */
export function formatPrice(cents: number) {
  return currency.format(cents / 100)
}
