import { describe, expect, it } from "vitest"

import {
  MAX_SIZES,
  parsePrice,
  priceText,
  productSchema,
  type ProductInput,
} from "./product-validations"

describe("parsePrice", () => {
  it.each([
    ["24.99", 2499],
    ["24", 2400],
    ["24.9", 2490],
    ["0.05", 5],
    [" 80.00 ", 8000],
    ["999999.99", 99999999],
  ])("reads %s as %i cents", (text, cents) => {
    expect(parsePrice(text)).toBe(cents)
  })

  it.each([
    "",
    "0",
    "0.00",
    "-5",
    "24.999",
    "1,000",
    "$24",
    "abc",
    "24.",
    ".5",
    "1e3",
    "1000000",
  ])("refuses %j", (text) => {
    expect(parsePrice(text)).toBeNull()
  })

  it("never goes through a fraction, so 19.99 and 0.07 are exact", () => {
    expect(parsePrice("19.99")).toBe(1999)
    expect(parsePrice("0.07")).toBe(7)
    expect(parsePrice("1.15")).toBe(115)
  })
})

describe("priceText", () => {
  it("is the inverse of parsePrice", () => {
    for (const cents of [
      1, 5, 99, 100, 2499, 8000, 99999999,
    ]) {
      expect(parsePrice(priceText(cents))).toBe(cents)
    }
    expect(priceText(5)).toBe("0.05")
  })
})

const valid: ProductInput = {
  name: "Classic Tee",
  description: "A soft cotton tee.",
  price: "24.99",
  category: "MEN",
  type: "T_SHIRTS",
  bestSeller: false,
  sizes: [
    { label: "S", stock: 5, expectedStock: null },
    { label: "M", stock: 0, expectedStock: null },
  ],
  colors: [{ name: "White", hex: "#ffffff" }],
}

/** The fields that failed, keyed by their path. */
function problems(change: Partial<ProductInput>) {
  const result = productSchema.safeParse({
    ...valid,
    ...change,
  })
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((i) => [
      i.path.join("."),
      i.message,
    ])
  )
}

describe("productSchema", () => {
  it("accepts a complete product", () => {
    expect(productSchema.safeParse(valid).success).toBe(
      true
    )
  })

  it("accepts a product with no colors and one size", () => {
    expect(
      productSchema.safeParse({
        ...valid,
        colors: [],
        sizes: [valid.sizes[0]],
      }).success
    ).toBe(true)
  })

  it("trims the name and the description", () => {
    const parsed = productSchema.parse({
      ...valid,
      name: "  Classic Tee ",
      description: " Soft. ",
    })

    expect(parsed).toMatchObject({
      name: "Classic Tee",
      description: "Soft.",
    })
  })

  it.each([
    ["a short name", { name: "A" }, "name"],
    ["a long name", { name: "x".repeat(101) }, "name"],
    [
      "no description",
      { description: "  " },
      "description",
    ],
    [
      "a price that is not a price",
      { price: "free" },
      "price",
    ],
    ["a price of zero", { price: "0" }, "price"],
    ["no sizes", { sizes: [] }, "sizes"],
    [
      "an unknown category",
      { category: "PETS" as never },
      "category",
    ],
    ["an unknown type", { type: "HATS" as never }, "type"],
  ])("refuses %s", (_why, change, path) => {
    expect(problems(change)).toHaveProperty(path)
  })

  it("refuses a size twice, whatever its case", () => {
    expect(
      problems({
        sizes: [
          { label: "M", stock: 1, expectedStock: null },
          { label: "m", stock: 2, expectedStock: null },
        ],
      })
    ).toHaveProperty(
      "sizes",
      "Each size can only appear once"
    )
  })

  it("refuses negative, fractional and missing stock", () => {
    for (const stock of [-1, 1.5, Number.NaN]) {
      expect(
        problems({
          sizes: [
            { label: "M", stock, expectedStock: null },
          ],
        })
      ).toHaveProperty(["sizes.0.stock"])
    }
  })

  it(`allows at most ${MAX_SIZES} sizes`, () => {
    const sizes = Array.from(
      { length: MAX_SIZES + 1 },
      (_, i) => ({
        label: `S${i}`,
        stock: 1,
        expectedStock: null,
      })
    )

    expect(problems({ sizes })).toHaveProperty("sizes")
  })

  it("refuses a color that is not a hex value, or named twice", () => {
    expect(
      problems({ colors: [{ name: "Red", hex: "red" }] })
    ).toHaveProperty(["colors.0.hex"])
    expect(
      problems({
        colors: [
          { name: "Red", hex: "#ff0000" },
          { name: "RED", hex: "#aa0000" },
        ],
      })
    ).toHaveProperty(
      "colors",
      "Each color can only appear once"
    )
  })
})
