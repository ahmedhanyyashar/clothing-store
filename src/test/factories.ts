import type {
  Category,
  ProductType,
} from "@/generated/prisma/enums"
import { prisma } from "@/lib/db/client"

let counter = 0

/** Creates a product with sensible defaults; override only what a test cares about. */
export async function createProduct(
  overrides: {
    name?: string
    priceCents?: number
    category?: Category
    type?: ProductType
    bestSeller?: boolean
    createdAt?: Date
    images?: string[]
    sizes?: { label: string; stock: number }[]
    colors?: { name: string; hex: string }[]
  } = {}
) {
  counter += 1

  return prisma.product.create({
    data: {
      name: overrides.name ?? `Product ${counter}`,
      description: "A product made for a test.",
      priceCents: overrides.priceCents ?? 1000,
      category: overrides.category ?? "MEN",
      type: overrides.type ?? "T_SHIRTS",
      bestSeller: overrides.bestSeller ?? false,
      createdAt: overrides.createdAt,
      images: {
        create: (
          overrides.images ?? ["/products/test.webp"]
        ).map((url, position) => ({ url, position })),
      },
      sizes: {
        create: (
          overrides.sizes ?? [{ label: "M", stock: 5 }]
        ).map((size, position) => ({ ...size, position })),
      },
      colors: {
        create: overrides.colors ?? [
          { name: "Black", hex: "#000000" },
        ],
      },
    },
  })
}

let userCounter = 0

/** Creates a verified user. */
export async function createUser(
  overrides: { name?: string; email?: string } = {}
) {
  userCounter += 1
  return prisma.user.create({
    data: {
      id: `user-${userCounter}`,
      name: overrides.name ?? `User ${userCounter}`,
      email:
        overrides.email ?? `user${userCounter}@example.com`,
      emailVerified: true,
    },
  })
}

/** Saves an address for a user, in the form the address queries store it. */
export async function createSavedAddress(
  userId: string,
  overrides: Partial<{
    fullName: string
    phone: string
    line1: string
    city: string
    region: string | null
    postalCode: string | null
    country: string
    notes: string | null
    isDefault: boolean
  }> = {}
) {
  return prisma.address.create({
    data: {
      userId,
      fullName: "Ada Lovelace",
      phone: "+12025550123",
      line1: "1 Main St",
      city: "Austin",
      region: "Texas",
      postalCode: "73301",
      country: "US",
      isDefault: true,
      ...overrides,
    },
  })
}
