import type {
  Category,
  ProductType,
} from "@/generated/prisma/enums"
import { prisma } from "@/lib/db/client"

// Sample catalog for development and demos. Running it replaces every product.
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

async function main() {
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

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
