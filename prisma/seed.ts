import { hashPassword } from "better-auth/crypto"

import type {
  Category,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductType,
} from "@/generated/prisma/enums"
import { prisma } from "@/lib/db/client"
import { generateOrderNumber } from "@/lib/orders/number"
import { computeTotals } from "@/lib/orders/pricing"

// The seed: `pnpm db:seed` loads the sample catalog and a demo shop on top of
// it. Running it again replaces both.

// The demo accounts (the sign-in page's buttons use the same values). Everything
// the demo makes has an address on this domain, which is how it is found again.
const DEMO_DOMAIN = "@clothing-store.example"
const DEMO_CUSTOMER_EMAIL = `demo${DEMO_DOMAIN}`
const DEMO_ADMIN_EMAIL = `demo-admin${DEMO_DOMAIN}`
const DEMO_PASSWORD = "demo-password"

// Sample catalog: running it replaces every product.
// Sizes are [label, stock] pairs, and image names refer to files in public/products.
type Seed = {
  name: string
  description: string
  priceCents: number
  category: Category
  type: ProductType
  bestSeller?: boolean
  image: string
  sizes: [label: string, stock: number][]
  colors: { name: string; hex: string }[]
}

const apparel = (stock: number[]): Seed["sizes"] =>
  ["S", "M", "L", "XL"].map((label, index) => [
    label,
    stock[index] ?? 0,
  ])

const products: Seed[] = [
  {
    name: "Classic White Tee",
    description:
      "A soft, everyday cotton t-shirt that goes with everything.",
    priceCents: 2499,
    category: "MEN",
    type: "T_SHIRTS",
    bestSeller: true,
    image: "classic-white-tee",
    sizes: apparel([12, 20, 18, 6]),
    colors: [{ name: "White", hex: "#ffffff" }],
  },
  {
    name: "Everyday Crew Tee",
    description:
      "A relaxed crew-neck tee in a heavier, longer-lasting cotton.",
    priceCents: 2999,
    category: "MEN",
    type: "T_SHIRTS",
    image: "everyday-crew-tee",
    sizes: apparel([8, 14, 0, 4]),
    colors: [
      { name: "White", hex: "#ffffff" },
      { name: "Heather Grey", hex: "#b8b8b8" },
    ],
  },
  {
    name: "Kids Graphic Tee",
    description:
      "A bright printed tee that survives the playground.",
    priceCents: 1999,
    category: "CHILDREN",
    type: "T_SHIRTS",
    image: "kids-graphic-tee",
    sizes: [
      ["4Y", 10],
      ["6Y", 10],
      ["8Y", 6],
      ["10Y", 0],
    ],
    colors: [{ name: "Orange", hex: "#f28c28" }],
  },
  {
    name: "Oxford Dress Shirt",
    description:
      "A crisp button-down in a fine cotton weave, made to be tucked in.",
    priceCents: 5499,
    category: "MEN",
    type: "SHIRTS",
    image: "oxford-dress-shirt",
    sizes: apparel([5, 9, 9, 3]),
    colors: [{ name: "Navy", hex: "#1f2a44" }],
  },
  {
    name: "Chambray Shirt",
    description:
      "A lightweight denim-look shirt that works open over a tee.",
    priceCents: 4999,
    category: "WOMEN",
    type: "SHIRTS",
    image: "chambray-shirt",
    sizes: apparel([6, 10, 7, 0]),
    colors: [{ name: "Blue", hex: "#6b86a8" }],
  },
  {
    name: "Tie-Dye Button Shirt",
    description:
      "A hand-dyed shirt with a gradient no two pieces share.",
    priceCents: 4499,
    category: "WOMEN",
    type: "SHIRTS",
    image: "tie-dye-button-shirt",
    sizes: apparel([0, 0, 0, 0]),
    colors: [
      { name: "Blue", hex: "#4a5fd8" },
      { name: "Coral", hex: "#f0795c" },
    ],
  },
  {
    name: "Pullover Hoodie",
    description:
      "A cosy fleece hoodie with a roomy hood and kangaroo pocket.",
    priceCents: 4499,
    category: "MEN",
    type: "HOODIES",
    bestSeller: true,
    image: "pullover-hoodie",
    sizes: [...apparel([10, 16, 14, 8]), ["XXL", 3]],
    colors: [{ name: "Grey", hex: "#9a9a9a" }],
  },
  {
    name: "Fleece Crewneck",
    description:
      "A soft brushed-fleece sweatshirt in a warm, neutral oat.",
    priceCents: 3999,
    category: "WOMEN",
    type: "HOODIES",
    image: "fleece-crewneck",
    sizes: apparel([7, 11, 9, 2]),
    colors: [{ name: "Oat", hex: "#d9c9ad" }],
  },
  {
    name: "Denim Jacket",
    description:
      "A classic-fit denim jacket that softens with every wash.",
    priceCents: 7999,
    category: "WOMEN",
    type: "JACKETS",
    image: "denim-jacket",
    sizes: apparel([4, 8, 6, 0]),
    colors: [{ name: "Light Blue", hex: "#9db4d1" }],
  },
  {
    name: "Rust Bomber Jacket",
    description:
      "A lightweight zip-up bomber with ribbed cuffs and hem.",
    priceCents: 8999,
    category: "MEN",
    type: "JACKETS",
    bestSeller: true,
    image: "rust-bomber-jacket",
    sizes: apparel([0, 6, 8, 5]),
    colors: [{ name: "Rust", hex: "#b4572f" }],
  },
  {
    name: "Light Wash Jeans",
    description:
      "High-rise jeans in a light, faded wash with a straight leg.",
    priceCents: 5999,
    category: "WOMEN",
    type: "JEANS",
    image: "light-wash-jeans",
    sizes: [
      ["26", 5],
      ["28", 9],
      ["30", 8],
      ["32", 3],
    ],
    colors: [{ name: "Light Blue", hex: "#a9c1dd" }],
  },
  {
    name: "Slim Fit Jeans",
    description:
      "Stretch denim cut close through the leg, with a clean finish.",
    priceCents: 5499,
    category: "MEN",
    type: "JEANS",
    image: "slim-fit-jeans",
    sizes: [
      ["30", 6],
      ["32", 12],
      ["34", 10],
      ["36", 0],
    ],
    colors: [{ name: "Dark Blue", hex: "#2f4766" }],
  },
  {
    name: "Court Sneakers",
    description:
      "Clean leather-look sneakers with a cushioned insole.",
    priceCents: 7499,
    category: "WOMEN",
    type: "SHOES",
    image: "court-sneakers",
    sizes: [
      ["37", 4],
      ["38", 7],
      ["39", 6],
      ["40", 2],
    ],
    colors: [{ name: "White", hex: "#ffffff" }],
  },
  {
    name: "Running Sneakers",
    description:
      "Breathable knit running shoes with a responsive sole.",
    priceCents: 8999,
    category: "MEN",
    type: "SHOES",
    bestSeller: true,
    image: "running-sneakers",
    sizes: [
      ["41", 5],
      ["42", 9],
      ["43", 8],
      ["44", 4],
    ],
    colors: [{ name: "Red", hex: "#c8202f" }],
  },
]

export async function seedCatalog() {
  await prisma.product.deleteMany()

  for (const [index, product] of products.entries()) {
    await prisma.product.create({
      data: {
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        category: product.category,
        type: product.type,
        bestSeller: product.bestSeller ?? false,
        // one day apart, so "latest arrivals" has a real order to show
        createdAt: new Date(
          Date.now() - index * 24 * 60 * 60 * 1000
        ),
        images: {
          create: [
            {
              url: `/products/${product.image}.webp`,
              position: 0,
            },
          ],
        },
        sizes: {
          create: product.sizes.map(
            ([label, stock], position) => ({
              label,
              stock,
              position,
            })
          ),
        },
        colors: { create: product.colors },
      },
    })
  }

  console.log(`Seeded ${products.length} products`)
}

// Demo data for showing the shop with something in it: customers, a long
// order history in every state, and the admin log that goes with it. Everything
// it makes belongs to the demo domain, so running it again first removes the
// previous demo data and leaves anyone else's account alone.

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

/** The same numbers every run, so the demo looks the same every time. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PEOPLE = [
  ["Demo Shopper", "demo", "Austin", "Texas", "73301"],
  [
    "Maya Patel",
    "maya.patel",
    "Seattle",
    "Washington",
    "98101",
  ],
  [
    "Liam O'Connor",
    "liam.oconnor",
    "Boston",
    "Massachusetts",
    "02108",
  ],
  [
    "Sofia Alvarez",
    "sofia.alvarez",
    "Miami",
    "Florida",
    "33101",
  ],
  ["Noah Kim", "noah.kim", "Portland", "Oregon", "97201"],
  [
    "Emma Johansson",
    "emma.johansson",
    "Chicago",
    "Illinois",
    "60601",
  ],
  [
    "Omar Haddad",
    "omar.haddad",
    "Denver",
    "Colorado",
    "80202",
  ],
  [
    "Chloe Dubois",
    "chloe.dubois",
    "New York",
    "New York",
    "10001",
  ],
  [
    "Jack Turner",
    "jack.turner",
    "Nashville",
    "Tennessee",
    "37201",
  ],
  [
    "Aisha Bello",
    "aisha.bello",
    "Atlanta",
    "Georgia",
    "30301",
  ],
  [
    "Lucas Meyer",
    "lucas.meyer",
    "Phoenix",
    "Arizona",
    "85001",
  ],
  [
    "Zoe Carter",
    "zoe.carter",
    "San Diego",
    "California",
    "92101",
  ],
] as const

/** How an order's life went. */
type Fate =
  | "delivered"
  | "shipped"
  | "confirmed"
  | "pending"
  | "cancelled"
  | "refunded"

const FATES: [Fate, number][] = [
  ["delivered", 0.58],
  ["shipped", 0.08],
  ["confirmed", 0.07],
  ["pending", 0.07],
  ["cancelled", 0.1],
  ["refunded", 0.1],
]

function pickFate(roll: number, ageDays: number): Fate {
  // old orders are finished: nothing from two months ago is still pending
  let fate: Fate = "delivered"
  let sum = 0
  for (const [name, share] of FATES) {
    sum += share
    if (roll < sum) {
      fate = name
      break
    }
  }
  const open = ["shipped", "confirmed", "pending"]
  return ageDays > 10 && open.includes(fate)
    ? "delivered"
    : fate
}

export async function seedDemo() {
  await removePreviousDemo()

  const rand = random(20261108)
  const now = Date.now()
  const password = await hashPassword(DEMO_PASSWORD)

  // the admin who "did" everything in the log
  const admin = await prisma.user.create({
    data: {
      id: "demo-admin",
      name: "Demo Admin",
      email: DEMO_ADMIN_EMAIL,
      emailVerified: true,
      role: "ADMIN",
      createdAt: new Date(now - 90 * DAY),
      accounts: {
        create: {
          id: "demo-admin-credential",
          accountId: "demo-admin",
          providerId: "credential",
          password,
        },
      },
    },
  })
  const adminLabel = `${admin.name} (${admin.email})`

  const customers = []
  for (const [index, person] of PEOPLE.entries()) {
    const [name, handle, city, region, postalCode] = person
    const id = `demo-user-${index}`
    const user = await prisma.user.create({
      data: {
        id,
        name,
        email: `${handle}${DEMO_DOMAIN}`,
        emailVerified: true,
        createdAt: new Date(now - (85 - index * 6) * DAY),
        accounts: {
          create: {
            id: `${id}-credential`,
            accountId: id,
            providerId: "credential",
            password,
          },
        },
        addresses: {
          create: {
            fullName: name,
            phone: `+1202555${String(1000 + index * 37).slice(-4)}`,
            line1: `${100 + index * 17} Market Street`,
            city,
            region,
            postalCode,
            country: "US",
            isDefault: true,
            label: "Home",
          },
        },
      },
      include: { addresses: true },
    })
    customers.push(user)
  }

  const products = await prisma.product.findMany({
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      sizes: true,
    },
  })
  if (products.length === 0)
    throw new Error(
      "Seed the catalog before the demo data."
    )

  // a few sizes running low or sold out, for the dashboard's list
  const low = [
    ["Classic White Tee", "L", 2],
    ["Denim Jacket", "M", 0],
    ["Court Sneakers", "40", 1],
    ["Pullover Hoodie", "S", 3],
  ] as const
  for (const [name, label, stock] of low) {
    await prisma.productSize.updateMany({
      where: { label, product: { name } },
      data: { stock },
    })
  }

  const ORDERS = 72
  for (let n = 0; n < ORDERS; n++) {
    // more orders lately than long ago
    const ageDays = Math.floor(Math.pow(rand(), 1.5) * 60)
    const placedAt = new Date(
      now - ageDays * DAY - Math.floor(rand() * 20) * HOUR
    )
    const buyer =
      customers[Math.floor(rand() * customers.length)]
    const address = buyer.addresses[0]
    const card = rand() < 0.45
    const method: PaymentMethod = card
      ? "CARD"
      : "CASH_ON_DELIVERY"

    let fate = pickFate(rand(), ageDays)
    // cash orders are never "refunded": there is nothing to give back
    if (!card && fate === "refunded") fate = "cancelled"
    // an unpaid card order is closed after about half an hour, so only a
    // very recent one can still be waiting
    if (card && fate === "pending" && ageDays >= 1)
      fate = "cancelled"

    const lines = Array.from(
      { length: 1 + Math.floor(rand() * 3) },
      () => {
        const product =
          products[Math.floor(rand() * products.length)]
        const size =
          product.sizes[
            Math.floor(rand() * product.sizes.length)
          ]
        return {
          product,
          size: size.label,
          quantity: 1 + Math.floor(rand() * 2),
        }
      }
    )
    const subtotal = lines.reduce(
      (sum, line) =>
        sum + line.product.priceCents * line.quantity,
      0
    )
    const totals = computeTotals(subtotal)

    // when each step happened
    const t = (hours: number) =>
      new Date(placedAt.getTime() + hours * HOUR)
    const paidByCard =
      card && fate !== "pending" && fate !== "cancelled"
    const status: OrderStatus =
      fate === "refunded" || fate === "cancelled"
        ? "CANCELLED"
        : fate === "delivered"
          ? "DELIVERED"
          : fate === "shipped"
            ? "SHIPPED"
            : fate === "confirmed"
              ? "CONFIRMED"
              : "PENDING"
    let paymentStatus: PaymentStatus = "PENDING"
    let paidAt: Date | null = null
    let refundedAt: Date | null = null
    if (paidByCard) {
      paymentStatus = "PAID"
      paidAt = t(0.1)
    }
    if (!card && fate === "delivered") {
      paymentStatus = "PAID"
      paidAt = t(72)
    }
    if (card && fate === "cancelled")
      paymentStatus = "FAILED"
    if (fate === "refunded") {
      paymentStatus = "REFUNDED"
      refundedAt = t(30)
    }
    // a paid card order is confirmed by its payment
    const effective: OrderStatus =
      paidByCard && status === "PENDING"
        ? "CONFIRMED"
        : status

    const number = generateOrderNumber()
    const order = await prisma.order.create({
      data: {
        number,
        userId: buyer.id,
        status: effective,
        paymentMethod: method,
        paymentStatus,
        ...(card
          ? {
              stripeSessionId: `cs_demo_${n}`,
              ...(paidByCard
                ? { stripePaymentIntentId: `pi_demo_${n}` }
                : {}),
            }
          : {}),
        paidAt,
        refundedAt,
        ...totals,
        idempotencyKey: `demo-${n}`,
        shipName: address.fullName,
        shipPhone: address.phone,
        shipLine1: address.line1,
        shipCity: address.city,
        shipRegion: address.region,
        shipPostalCode: address.postalCode,
        shipCountry: address.country,
        placedAt,
        updatedAt: placedAt,
        cancelledAt:
          effective === "CANCELLED" ? t(30) : null,
        items: {
          create: lines.map((line) => ({
            productId: line.product.id,
            name: line.product.name,
            size: line.size,
            imageUrl: line.product.images[0]?.url ?? null,
            unitPriceCents: line.product.priceCents,
            quantity: line.quantity,
          })),
        },
      },
    })

    // the admin's log of what happened to it, in the words the app uses
    const steps: [number, string, string][] = []
    const money = (cents: number) =>
      `$${(cents / 100).toFixed(2)}`
    if (
      !paidByCard &&
      effective !== "PENDING" &&
      effective !== "CANCELLED"
    )
      steps.push([
        12,
        "order.confirm",
        `${number} was confirmed`,
      ])
    if (
      effective === "SHIPPED" ||
      effective === "DELIVERED"
    )
      steps.push([
        36,
        "order.ship",
        `${number} was shipped`,
      ])
    if (effective === "DELIVERED")
      steps.push([
        72,
        "order.deliver",
        card
          ? `${number} was delivered`
          : `${number} was delivered, and the cash payment of ${money(totals.totalCents)} was recorded`,
      ])
    if (effective === "CANCELLED")
      steps.push([
        30,
        "order.cancel",
        fate === "refunded"
          ? `${number} was cancelled; ${money(totals.totalCents)} is to be refunded`
          : `${number} was cancelled`,
      ])
    if (fate === "refunded")
      steps.push([
        30.1,
        "order.refund",
        `${number} was refunded ${money(totals.totalCents)}`,
      ])
    for (const [hours, action, summary] of steps) {
      const when = t(hours)
      if (when.getTime() > now) continue
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorLabel: adminLabel,
          action,
          targetType: "order",
          targetId: order.id,
          summary,
          createdAt: when,
        },
      })
    }
  }

  // an operator's command has no account
  await prisma.auditLog.create({
    data: {
      actorLabel: "operator",
      action: "admin.grant",
      targetType: "user",
      targetId: admin.id,
      summary: `${admin.email} was made an admin`,
      createdAt: new Date(now - 90 * DAY),
    },
  })

  process.stdout.write(
    `Seeded demo data: ${customers.length + 1} accounts, ${ORDERS} orders. ` +
      `Sign in as ${DEMO_CUSTOMER_EMAIL} or ${DEMO_ADMIN_EMAIL} ` +
      `(password: ${DEMO_PASSWORD}).\n`
  )
}

async function removePreviousDemo() {
  await prisma.order.deleteMany({
    where: { idempotencyKey: { startsWith: "demo-" } },
  })
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorLabel: { contains: DEMO_DOMAIN } },
        { summary: { contains: DEMO_DOMAIN } },
      ],
    },
  })
  await prisma.user.deleteMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
  })
}

/** Only the command line runs the seed; tests import the functions above. */
if (/seed\.(ts|mjs)$/.test(process.argv[1] ?? "")) {
  seedAll()
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}

export async function seedAll() {
  await seedCatalog()
  await seedDemo()
}
