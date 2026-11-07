import {
  Category,
  ProductType,
} from "@/generated/prisma/enums"

type Info = { slug: string; label: string }

// `satisfies Record<…>` makes the compiler reject a new enum value that has no
// slug or label here. The slug is what appears in the shop's URL.
export const CATEGORY_INFO = {
  MEN: { slug: "men", label: "Men" },
  WOMEN: { slug: "women", label: "Women" },
  CHILDREN: { slug: "children", label: "Children" },
} satisfies Record<Category, Info>

export const TYPE_INFO = {
  T_SHIRTS: { slug: "t-shirts", label: "T-shirts" },
  SHIRTS: { slug: "shirts", label: "Shirts" },
  HOODIES: { slug: "hoodies", label: "Hoodies" },
  JACKETS: { slug: "jackets", label: "Jackets" },
  JEANS: { slug: "jeans", label: "Jeans" },
  SHOES: { slug: "shoes", label: "Shoes" },
} satisfies Record<ProductType, Info>

export const CATEGORIES = Object.values(Category)
export const PRODUCT_TYPES = Object.values(ProductType)

export function categoryFromSlug(slug: string | null) {
  return CATEGORIES.find(
    (category) => CATEGORY_INFO[category].slug === slug
  )
}

export function typeFromSlug(slug: string | null) {
  return PRODUCT_TYPES.find(
    (type) => TYPE_INFO[type].slug === slug
  )
}
