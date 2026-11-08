/** A flat fee, waived on larger orders. These two numbers are the whole shipping policy. */
export const SHIPPING_FLAT_CENTS = 500
export const FREE_SHIPPING_FROM_CENTS = 7500

/**
 * What an order costs. Prices already include tax, so there is no tax line.
 * Whole cents in and out: nothing here is ever a fraction.
 */
export function computeTotals(subtotalCents: number) {
  const shippingCents =
    subtotalCents === 0 ||
    subtotalCents >= FREE_SHIPPING_FROM_CENTS
      ? 0
      : SHIPPING_FLAT_CENTS

  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  }
}
