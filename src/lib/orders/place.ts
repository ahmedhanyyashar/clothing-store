import type { Prisma } from "@/generated/prisma/client"
import { lineKey, type CartItem } from "@/lib/cart/model"
import { prisma } from "@/lib/db/client"

import { generateOrderNumber } from "./number"
import { computeTotals } from "./pricing"

type Tx = Prisma.TransactionClient

export type OrderLine = CartItem & { quantity: number }

export type LineProblem = {
  productId: string
  size: string
  /** gone, or fewer left than asked for */
  code: "unavailable" | "insufficient"
  available: number
}

export type PlaceOrderResult =
  | {
      ok: true
      orderId: string
      number: string
      reused: boolean
    }
  | { ok: false; reason: "address-not-found" }
  | {
      ok: false
      reason: "problems"
      problems: LineProblem[]
    }

/** Thrown inside the transaction to roll it back when the stock ran out under us. */
class StockConflict extends Error {}

const MAX_ATTEMPTS = 3

type StockRow = {
  stock: number
  name: string
  priceCents: number
  imageUrl: string | null
  productId: string
}

async function readStock(db: Tx, lines: OrderLine[]) {
  const rows = await db.productSize.findMany({
    where: {
      OR: lines.map((line) => ({
        productId: line.productId,
        label: line.size,
      })),
    },
    select: {
      label: true,
      stock: true,
      product: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  })

  return new Map<string, StockRow>(
    rows.map((row) => [
      lineKey({
        productId: row.product.id,
        size: row.label,
      }),
      {
        stock: row.stock,
        name: row.product.name,
        priceCents: row.product.priceCents,
        imageUrl: row.product.images[0]?.url ?? null,
        productId: row.product.id,
      },
    ])
  )
}

function findProblems(
  lines: OrderLine[],
  stock: Map<string, StockRow>
): LineProblem[] {
  const problems: LineProblem[] = []
  for (const line of lines) {
    const row = stock.get(lineKey(line))
    if (!row) {
      problems.push({
        productId: line.productId,
        size: line.size,
        code: "unavailable",
        available: 0,
      })
    } else if (row.stock < line.quantity) {
      problems.push({
        productId: line.productId,
        size: line.size,
        code:
          row.stock === 0 ? "unavailable" : "insufficient",
        available: row.stock,
      })
    }
  }
  return problems
}

/**
 * Turns a cart into an order, or says what stands in the way. Everything the
 * browser sent is a request: prices, names and stock are read here, in the
 * same transaction that takes the stock.
 *
 * - The address is copied into the order, so editing or deleting the saved
 *   one later never changes it.
 * - Stock is taken with `stock >= quantity` in the UPDATE itself. A check
 *   followed by a write could be passed by two buyers at once; this cannot,
 *   because the database re-checks the row it has locked. If any line fails
 *   the whole transaction rolls back and no stock moves.
 * - `idempotencyKey` identifies one checkout attempt. Sending it again
 *   returns the order that attempt made.
 *
 * Callers validate the shape of `items` (see `placeOrderSchema`) and check
 * who is asking; this takes `userId` on trust.
 */
export async function placeOrder(input: {
  userId: string
  addressId: string
  idempotencyKey: string
  items: OrderLine[]
}): Promise<PlaceOrderResult> {
  const { userId, addressId, idempotencyKey } = input
  // a fixed order of locking, so two orders over the same sizes cannot deadlock
  const items = [...input.items].sort((a, b) =>
    lineKey(a).localeCompare(lineKey(b))
  )
  if (
    items.length === 0 ||
    new Set(items.map(lineKey)).size !== items.length
  ) {
    throw new Error(
      "an order needs distinct, non-empty lines"
    )
  }

  const earlier = () => findByKey(userId, idempotencyKey)

  for (let attempt = 1; ; attempt++) {
    const reused = await earlier()
    if (reused) return reused

    try {
      return await prisma.$transaction((tx) =>
        create(tx, {
          userId,
          addressId,
          idempotencyKey,
          items,
        })
      )
    } catch (error) {
      if (error instanceof StockConflict) {
        const stock = await readStock(prisma, items)
        return {
          ok: false,
          reason: "problems",
          problems: findProblems(items, stock),
        }
      }
      // A unique violation is a repeat of this attempt landing at the same
      // time (it now exists), or, very rarely, a clash of order numbers.
      if (isUniqueViolation(error)) {
        const raced = await earlier()
        if (raced) return raced
        if (attempt < MAX_ATTEMPTS) continue
      }
      throw error
    }
  }
}

async function findByKey(
  userId: string,
  idempotencyKey: string
): Promise<PlaceOrderResult | null> {
  const order = await prisma.order.findFirst({
    where: { userId, idempotencyKey },
    select: { id: true, number: true },
  })
  return order
    ? {
        ok: true,
        orderId: order.id,
        number: order.number,
        reused: true,
      }
    : null
}

async function create(
  tx: Tx,
  input: {
    userId: string
    addressId: string
    idempotencyKey: string
    items: OrderLine[]
  }
): Promise<PlaceOrderResult> {
  const { userId, addressId, idempotencyKey, items } = input

  const address = await tx.address.findFirst({
    where: { id: addressId, userId },
  })
  if (!address)
    return { ok: false, reason: "address-not-found" }

  const stock = await readStock(tx, items)
  const problems = findProblems(items, stock)
  if (problems.length > 0) {
    return { ok: false, reason: "problems", problems }
  }

  for (const line of items) {
    const { count } = await tx.productSize.updateMany({
      where: {
        productId: line.productId,
        label: line.size,
        stock: { gte: line.quantity },
      },
      data: { stock: { decrement: line.quantity } },
    })
    if (count === 0) throw new StockConflict()
  }

  const subtotalCents = items.reduce(
    (sum, line) =>
      sum +
      stock.get(lineKey(line))!.priceCents * line.quantity,
    0
  )

  const order = await tx.order.create({
    data: {
      number: generateOrderNumber(),
      userId,
      paymentMethod: "CASH_ON_DELIVERY",
      ...computeTotals(subtotalCents),
      idempotencyKey,
      shipName: address.fullName,
      shipPhone: address.phone,
      shipLine1: address.line1,
      shipLine2: address.line2,
      shipCity: address.city,
      shipRegion: address.region,
      shipPostalCode: address.postalCode,
      shipCountry: address.country,
      shipNotes: address.notes,
      items: {
        create: items.map((line) => {
          const row = stock.get(lineKey(line))!
          return {
            productId: row.productId,
            name: row.name,
            size: line.size,
            imageUrl: row.imageUrl,
            unitPriceCents: row.priceCents,
            quantity: line.quantity,
          }
        }),
      },
    },
    select: { id: true, number: true },
  })

  return {
    ok: true,
    orderId: order.id,
    number: order.number,
    reused: false,
  }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  )
}
