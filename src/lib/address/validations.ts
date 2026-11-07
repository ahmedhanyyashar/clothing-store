import { parsePhoneNumberFromString } from "libphonenumber-js/min"
import { z } from "zod"

import {
  COUNTRIES,
  COUNTRY_CODES,
  isCountryCode,
  normalizePostalCode,
  type CountryInfo,
} from "./countries"

/** The most addresses one account can save. */
// Home, work and one more cover nearly everyone. The cap also bounds how many
// rows one account can create.
export const MAX_ADDRESSES = 3

export const addressSchema = z
  .object({
    label: z
      .string()
      .trim()
      .max(30, "Keep the label under 30 characters"),
    fullName: z
      .string()
      .trim()
      .min(2, "Enter the recipient's name")
      .max(100, "Name must be at most 100 characters"),
    phone: z.string().trim().min(1, "Enter a phone number"),
    line1: z
      .string()
      .trim()
      .min(3, "Enter the street address")
      .max(100, "Address must be at most 100 characters"),
    line2: z
      .string()
      .trim()
      .max(100, "Address must be at most 100 characters"),
    city: z
      .string()
      .trim()
      .min(2, "Enter the city")
      .max(60, "City must be at most 60 characters"),
    region: z
      .string()
      .trim()
      .max(60, "Must be at most 60 characters"),
    postalCode: z
      .string()
      .trim()
      .max(12, "Postal code is too long"),
    country: z.enum(COUNTRY_CODES, "Choose a country"),
    notes: z
      .string()
      .trim()
      .max(
        300,
        "Delivery notes must be at most 300 characters"
      ),
    isDefault: z.boolean(),
  })
  .superRefine((address, ctx) => {
    // an unknown country is already reported on its own
    const country: CountryInfo | undefined =
      COUNTRIES[address.country]
    if (!country) return
    const fail = (path: string, message: string) =>
      ctx.addIssue({
        code: "custom",
        path: [path],
        message,
      })

    if (country.postalCode) {
      const postalCode = normalizePostalCode(
        address.postalCode
      )
      if (!postalCode)
        fail("postalCode", "Enter a postal code")
      else if (!country.postalCode.pattern.test(postalCode))
        fail(
          "postalCode",
          `Enter a valid postal code, for example ${country.postalCode.example}`
        )
    }

    if (country.regionRequired && !address.region)
      fail(
        "region",
        `Choose a ${country.regionLabel.toLowerCase()}`
      )
    else if (
      address.region &&
      country.regions &&
      !(country.regions as readonly string[]).includes(
        address.region
      )
    )
      fail(
        "region",
        `Choose a ${country.regionLabel.toLowerCase()} from the list`
      )

    // an empty phone already has its own message
    if (
      address.phone &&
      !parsePhoneNumberFromString(
        address.phone,
        address.country
      )?.isValid()
    )
      fail("phone", "Enter a valid phone number")
  })

export type AddressInput = z.infer<typeof addressSchema>

/** What is stored: trimmed, the postal code upper-cased, the phone in international form, empty optionals as null. */
export function normalizeAddress(input: AddressInput) {
  const phone = parsePhoneNumberFromString(
    input.phone,
    input.country
  )
  return {
    label: input.label || null,
    fullName: input.fullName,
    phone: phone ? phone.number : input.phone,
    line1: input.line1,
    line2: input.line2 || null,
    city: input.city,
    region: input.region || null,
    postalCode: input.postalCode
      ? normalizePostalCode(input.postalCode)
      : null,
    country: input.country,
    notes: input.notes || null,
    isDefault: input.isDefault,
  }
}

export type NormalizedAddress = ReturnType<
  typeof normalizeAddress
>

/** The lines of an address as printed on a parcel. */
export function addressLines(address: {
  fullName: string
  line1: string
  line2: string | null
  city: string
  region: string | null
  postalCode: string | null
  country: string
}) {
  return [
    address.fullName,
    address.line1,
    address.line2,
    [address.postalCode, address.city]
      .filter(Boolean)
      .join(" "),
    address.region,
    isCountryCode(address.country)
      ? COUNTRIES[address.country].name
      : address.country,
  ].filter((line): line is string => Boolean(line))
}
