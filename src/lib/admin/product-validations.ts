import { z } from "zod"

import {
  Category,
  ProductType,
} from "@/generated/prisma/enums"
import { isPhotoKey, MAX_PHOTOS } from "@/lib/storage/rules"

export const MAX_SIZES = 12
export const MAX_COLORS = 12
export const MAX_STOCK = 100_000

/**
 * "24.99" or "24" as whole cents, without ever making a fraction: 24.99 * 100
 * is 2498.9999999999995 in floating point. Null for anything else, and for 0.
 */
export function parsePrice(text: string): number | null {
  const match = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(
    text.trim()
  )
  if (!match) return null
  const cents =
    Number(match[1]) * 100 +
    Number((match[2] ?? "").padEnd(2, "0"))
  return cents > 0 ? cents : null
}

/** Whole cents as the text of a price field: 2499 becomes "24.99". */
export function priceText(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`
}

const unique = (values: string[]) =>
  new Set(values.map((value) => value.toLowerCase()))
    .size === values.length

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Enter a description")
    .max(
      2000,
      "Description must be at most 2000 characters"
    ),
  // text, so what the admin typed is what is checked
  price: z
    .string()
    .refine(
      (value) => parsePrice(value) !== null,
      "Enter a price such as 24.99"
    ),
  category: z.enum(Category, "Choose a category"),
  type: z.enum(ProductType, "Choose a type"),
  bestSeller: z.boolean(),
  sizes: z
    .array(
      z.object({
        label: z
          .string()
          .trim()
          .min(1, "Enter a size")
          .max(12, "A size is at most 12 characters"),
        stock: z
          .number("Enter the stock")
          .int("Stock must be a whole number")
          .min(0, "Stock cannot be negative")
          .max(
            MAX_STOCK,
            `Stock cannot be more than ${MAX_STOCK}`
          ),
        // The stock the admin saw when the page loaded. A save changes a size's
        // stock only if the admin changed it, and only if nobody else has since.
        // Null for a size that is new.
        expectedStock: z.number().int().min(0).nullable(),
      })
    )
    .min(1, "Add at least one size")
    .max(
      MAX_SIZES,
      `A product has at most ${MAX_SIZES} sizes`
    )
    .refine(
      (sizes) => unique(sizes.map((size) => size.label)),
      "Each size can only appear once"
    ),
  // In display order, the first being the one shown in lists. A photo is either
  // one the product already has (`id`) or one just uploaded (`key`). `url` is
  // only for showing it in the form: the server never reads it.
  photos: z
    .array(
      z
        .object({
          id: z.string().nullable(),
          key: z
            .string()
            .refine(isPhotoKey, "Invalid photo")
            .nullable(),
          url: z.string(),
        })
        .refine(
          (photo) =>
            (photo.id === null) !== (photo.key === null),
          "Invalid photo"
        )
    )
    .max(
      MAX_PHOTOS,
      `A product has at most ${MAX_PHOTOS} photos`
    )
    .refine(
      (photos) =>
        new Set(photos.map((p) => p.id ?? p.key)).size ===
        photos.length,
      "Each photo can only appear once"
    ),
  colors: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, "Name the color")
          .max(30, "A color name is at most 30 characters"),
        hex: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
      })
    )
    .max(
      MAX_COLORS,
      `A product has at most ${MAX_COLORS} colors`
    )
    .refine(
      (colors) => unique(colors.map((color) => color.name)),
      "Each color can only appear once"
    ),
})

export type ProductInput = z.infer<typeof productSchema>
