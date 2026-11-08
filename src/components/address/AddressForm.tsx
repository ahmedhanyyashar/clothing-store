"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { saveAddress } from "@/lib/address/actions"
import {
  COUNTRIES,
  COUNTRY_CODES,
  isCountryCode,
} from "@/lib/address/countries"
import type { SavedAddress } from "@/lib/address/queries"
import {
  addressSchema,
  type AddressInput,
} from "@/lib/address/validations"

const control =
  "w-full rounded-md border border-input bg-background px-3 text-sm"

const LABEL_SUGGESTIONS = ["Home", "Work", "Other"]

function initialValues(
  address: SavedAddress | undefined,
  isFirst: boolean
): AddressInput {
  return {
    label: address?.label ?? "",
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    city: address?.city ?? "",
    region: address?.region ?? "",
    postalCode: address?.postalCode ?? "",
    country:
      address && isCountryCode(address.country)
        ? address.country
        : "US",
    notes: address?.notes ?? "",
    // the first address is the default whatever the box says
    isDefault: address?.isDefault ?? isFirst,
  }
}

/** Adds an address, or edits `address`. `isFirst` is true while the user has none saved. */
export function AddressForm({
  address,
  isFirst = false,
  next = "/account/addresses",
}: {
  address?: SavedAddress
  isFirst?: boolean
  /** Where to go after saving or cancelling: the page the shopper came from. */
  next?: string
}) {
  const router = useRouter()
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialValues(address, isFirst),
  })
  const country =
    COUNTRIES[
      useWatch({ control: form.control, name: "country" })
    ]
  // the current default stays the default until another address is chosen
  const defaultLocked =
    isFirst || address?.isDefault === true

  async function onSubmit(values: AddressInput) {
    const result = await saveAddress(
      address?.id ?? null,
      values
    )
    if (!result.ok) {
      for (const [field, message] of Object.entries(
        result.fieldErrors ?? {}
      )) {
        form.setError(field as keyof AddressInput, {
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
    router.push(next as Route)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={(event) =>
          void form.handleSubmit(onSubmit)(event)
        }
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label (optional)</FormLabel>
              <FormControl>
                <Input list="address-labels" {...field} />
              </FormControl>
              <datalist id="address-labels">
                {LABEL_SUGGESTIONS.map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <select
                  className={`${control} h-9`}
                  autoComplete="country"
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    // the region list and the rules for the postal code and phone change
                    form.setValue("region", "")
                    if (form.formState.isSubmitted)
                      void form.trigger()
                  }}
                >
                  {COUNTRY_CODES.map((code) => (
                    <option key={code} value={code}>
                      {COUNTRIES[code].name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  autoComplete="tel"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street address</FormLabel>
              <FormControl>
                <Input
                  autoComplete="address-line1"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Apartment, suite, floor (optional)
              </FormLabel>
              <FormControl>
                <Input
                  autoComplete="address-line2"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input
                  autoComplete="address-level2"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {country.regionLabel}
                {country.regionRequired
                  ? ""
                  : " (optional)"}
              </FormLabel>
              <FormControl>
                {country.regions ? (
                  <select
                    className={`${control} h-9`}
                    autoComplete="address-level1"
                    {...field}
                  >
                    <option value="">Choose…</option>
                    {country.regions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    autoComplete="address-level1"
                    {...field}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {country.postalCode && (
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal code</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="postal-code"
                    placeholder={
                      country.postalCode?.example
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Delivery notes (optional)
              </FormLabel>
              <FormControl>
                <textarea
                  rows={3}
                  className={`${control} py-2`}
                  placeholder="Gate code, where to leave the parcel…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  className="size-4"
                  checked={field.value}
                  disabled={defaultLocked}
                  onChange={(event) =>
                    field.onChange(event.target.checked)
                  }
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              </FormControl>
              <FormLabel className="font-normal">
                {defaultLocked
                  ? "Default address"
                  : "Make this my default address"}
              </FormLabel>
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Saving…"
              : "Save address"}
          </Button>
          <Button asChild variant="ghost">
            <Link href={next as Route}>Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  )
}
