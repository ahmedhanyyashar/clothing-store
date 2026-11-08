"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useFieldArray,
  useForm,
  type FieldPath,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveProductAction } from "@/lib/admin/product-actions"
import {
  MAX_COLORS,
  MAX_SIZES,
  productSchema,
  type ProductInput,
} from "@/lib/admin/product-validations"
import {
  CATEGORIES,
  CATEGORY_INFO,
  PRODUCT_TYPES,
  TYPE_INFO,
} from "@/lib/catalog/taxonomy"

const control =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm"

const LIST = "/admin/products" as Route

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

const EMPTY: ProductInput = {
  name: "",
  description: "",
  price: "",
  category: "MEN",
  type: "T_SHIRTS",
  bestSeller: false,
  sizes: [{ label: "", stock: 0, expectedStock: null }],
  colors: [],
}

/**
 * Adds a product, or edits `product` (pass its values, with each size's
 * `expectedStock` set to the stock it has now). Photos are not managed here.
 */
export function ProductForm({
  id,
  product = EMPTY,
}: {
  id?: string
  product?: ProductInput
}) {
  const router = useRouter()
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product,
  })
  const {
    register,
    control: formControl,
    formState: { errors, isSubmitting },
  } = form
  const sizes = useFieldArray({
    control: formControl,
    name: "sizes",
  })
  const colors = useFieldArray({
    control: formControl,
    name: "colors",
  })

  async function onSubmit(values: ProductInput) {
    const result = await saveProductAction(
      id ?? null,
      values
    )
    if (!result.ok) {
      for (const [path, message] of Object.entries(
        result.fieldErrors ?? {}
      )) {
        form.setError(path as FieldPath<ProductInput>, {
          message,
        })
      }
      if (result.message || !result.fieldErrors) {
        form.setError("root", {
          message:
            result.message ??
            "Something went wrong. Try again.",
        })
      }
      return
    }
    router.push(LIST)
    router.refresh()
  }

  return (
    <form
      noValidate
      onSubmit={(event) =>
        void form.handleSubmit(onSubmit)(event)
      }
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={4}
          className={`${control} h-auto py-2`}
          {...register("description")}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">Price (USD)</Label>
          <Input
            id="price"
            inputMode="decimal"
            placeholder="24.99"
            {...register("price")}
          />
          <FieldError message={errors.price?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className={control}
            {...register("category")}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_INFO[category].label}
              </option>
            ))}
          </select>
          <FieldError message={errors.category?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className={control}
            {...register("type")}
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_INFO[type].label}
              </option>
            ))}
          </select>
          <FieldError message={errors.type?.message} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          {...register("bestSeller")}
        />
        Show among the best sellers on the home page
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">
          Sizes and stock
        </legend>
        {sizes.fields.map((field, index) => {
          const existing = field.expectedStock !== null
          return (
            <div
              key={field.id}
              className="flex flex-wrap items-start gap-3"
            >
              <div className="space-y-1">
                <Label
                  htmlFor={`size-${index}`}
                  className="sr-only"
                >
                  Size {index + 1}
                </Label>
                <Input
                  id={`size-${index}`}
                  placeholder="Size, e.g. M"
                  className="w-32"
                  // a size is known by its label, so an existing one is not renamed
                  readOnly={existing}
                  {...register(`sizes.${index}.label`)}
                />
                <FieldError
                  message={
                    errors.sizes?.[index]?.label?.message
                  }
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={`stock-${index}`}
                  className="sr-only"
                >
                  Stock of size {field.label || index + 1}
                </Label>
                <Input
                  id={`stock-${index}`}
                  type="number"
                  min={0}
                  className="w-28"
                  {...register(`sizes.${index}.stock`, {
                    valueAsNumber: true,
                  })}
                />
                <FieldError
                  message={
                    errors.sizes?.[index]?.stock?.message
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove size ${field.label || index + 1}`}
                disabled={sizes.fields.length === 1}
                onClick={() => sizes.remove(index)}
              >
                Remove
              </Button>
            </div>
          )
        })}
        <FieldError
          message={
            errors.sizes?.message ??
            errors.sizes?.root?.message
          }
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sizes.fields.length >= MAX_SIZES}
          onClick={() =>
            sizes.append({
              label: "",
              stock: 0,
              expectedStock: null,
            })
          }
        >
          Add a size
        </Button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">
          Colors (optional)
        </legend>
        {colors.fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-wrap items-start gap-3"
          >
            <div className="space-y-1">
              <Label
                htmlFor={`color-name-${index}`}
                className="sr-only"
              >
                Color name {index + 1}
              </Label>
              <Input
                id={`color-name-${index}`}
                placeholder="Color, e.g. Navy"
                className="w-40"
                {...register(`colors.${index}.name`)}
              />
              <FieldError
                message={
                  errors.colors?.[index]?.name?.message
                }
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor={`color-hex-${index}`}
                className="sr-only"
              >
                Color {index + 1}
              </Label>
              <input
                id={`color-hex-${index}`}
                type="color"
                className="h-9 w-14 rounded-md border border-input bg-background p-1"
                {...register(`colors.${index}.hex`)}
              />
              <FieldError
                message={
                  errors.colors?.[index]?.hex?.message
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove color ${field.name || index + 1}`}
              onClick={() => colors.remove(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <FieldError
          message={
            errors.colors?.message ??
            errors.colors?.root?.message
          }
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={colors.fields.length >= MAX_COLORS}
          onClick={() =>
            colors.append({ name: "", hex: "#000000" })
          }
        >
          Add a color
        </Button>
      </fieldset>

      <FieldError message={errors.root?.message} />

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving…"
            : id
              ? "Save changes"
              : "Add product"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={LIST}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
