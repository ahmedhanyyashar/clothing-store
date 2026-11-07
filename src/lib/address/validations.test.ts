import { describe, expect, it } from "vitest"

import { COUNTRIES, COUNTRY_CODES } from "./countries"
import {
  addressLines,
  addressSchema,
  normalizeAddress,
  type AddressInput,
} from "./validations"

const valid: AddressInput = {
  label: "Home",
  fullName: "Ada Lovelace",
  phone: "(202) 555-0123",
  line1: "1600 Pennsylvania Ave NW",
  line2: "",
  city: "Washington",
  region: "District of Columbia",
  postalCode: "20500",
  country: "US",
  notes: "",
  isDefault: false,
}

/** The messages for each field that failed, keyed by field. */
function problems(change: Partial<AddressInput>) {
  const result = addressSchema.safeParse({
    ...valid,
    ...change,
  })
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((i) => [i.path[0], i.message])
  )
}

describe("addressSchema", () => {
  it("accepts a complete address", () => {
    expect(addressSchema.safeParse(valid).success).toBe(
      true
    )
  })

  it("accepts an address with only the required parts", () => {
    expect(
      addressSchema.safeParse({
        ...valid,
        label: "",
        region: "Texas",
        notes: "",
      }).success
    ).toBe(true)
  })

  it.each([
    ["fullName", { fullName: "A" }],
    ["line1", { line1: "12" }],
    ["city", { city: "" }],
    ["phone", { phone: "" }],
    ["label", { label: "x".repeat(31) }],
    ["notes", { notes: "x".repeat(301) }],
  ])("rejects a bad %s", (field, change) => {
    expect(problems(change)).toHaveProperty(field)
  })

  it("rejects a country that is not on the list", () => {
    const result = addressSchema.safeParse({
      ...valid,
      country: "ZZ",
    })

    expect(result.success).toBe(false)
  })

  it("has a rule for every country it offers", () => {
    for (const code of COUNTRY_CODES) {
      expect(COUNTRIES[code].name).toBeTruthy()
    }
  })
})

describe("postal codes follow the country", () => {
  it.each([
    ["US", "90210", true],
    ["US", "90210-1234", true],
    ["US", "9021", false],
    ["CA", "k1a 0b1", true],
    ["CA", "12345", false],
    ["GB", "SW1A 1AA", true],
    ["GB", "sw1a1aa", true],
    ["GB", "12345", false],
    ["NL", "1012 ab", true],
    ["DE", "10115", true],
    ["DE", "1011", false],
    ["AU", "2000", true],
    ["EG", "11511", true],
  ] as const)(
    "%s %s is valid: %s",
    (country, postalCode, ok) => {
      const region =
        country === "US"
          ? "Texas"
          : country === "CA"
            ? "Ontario"
            : country === "AU"
              ? "Victoria"
              : ""
      const phone: Record<string, string> = {
        US: "202 555 0123",
        CA: "613 555 0199",
        GB: "020 7946 0958",
        NL: "020 123 4567",
        DE: "030 123456",
        AU: "02 9374 4000",
        EG: "02 2345 6789",
      }

      const result = problems({
        country,
        postalCode,
        region,
        phone: phone[country],
      })

      expect("postalCode" in result).toBe(!ok)
    }
  )

  it("asks for a postal code where the country has them, with an example", () => {
    expect(problems({ postalCode: "" }).postalCode).toBe(
      "Enter a postal code"
    )
    expect(
      problems({ postalCode: "abc" }).postalCode
    ).toMatch(/for example 90210/)
  })

  it("does not ask for one in the United Arab Emirates", () => {
    expect(
      problems({
        country: "AE",
        postalCode: "",
        region: "Dubai",
        phone: "04 123 4567",
      })
    ).toEqual({})
  })
})

describe("regions follow the country", () => {
  it("requires one where the country needs it, and only from its list", () => {
    expect(problems({ region: "" }).region).toBe(
      "Choose a state"
    )
    expect(problems({ region: "Ontario" }).region).toBe(
      "Choose a state from the list"
    )
    expect(
      problems({
        country: "CA",
        postalCode: "K1A 0B1",
        region: "Ontario",
        phone: "613 555 0199",
      })
    ).toEqual({})
  })

  it("accepts any text, or none, where the country has no list", () => {
    const gb = {
      country: "GB",
      postalCode: "SW1A 1AA",
      phone: "020 7946 0958",
    } as const

    expect(problems({ ...gb, region: "" })).toEqual({})
    expect(
      problems({ ...gb, region: "Greater London" })
    ).toEqual({})
  })
})

describe("phone numbers follow the country", () => {
  it("accepts a local number for the chosen country and an international one", () => {
    expect(problems({ phone: "202-555-0123" })).toEqual({})
    expect(problems({ phone: "+44 20 7946 0958" })).toEqual(
      {}
    )
  })

  it.each(["abc", "12345", "555-0123"])(
    "rejects %s",
    (phone) => {
      expect(problems({ phone }).phone).toBe(
        "Enter a valid phone number"
      )
    }
  )
})

describe("normalizeAddress", () => {
  it("stores the phone in international form and the postal code upper-cased", () => {
    const stored = normalizeAddress(
      addressSchema.parse({
        ...valid,
        country: "GB",
        postalCode: " sw1a   1aa ",
        phone: "020 7946 0958",
        region: "",
      })
    )

    expect(stored.phone).toBe("+442079460958")
    expect(stored.postalCode).toBe("SW1A 1AA")
  })

  it("stores empty optional parts as null", () => {
    const stored = normalizeAddress(
      addressSchema.parse({
        ...valid,
        label: "",
        region: "Texas",
      })
    )

    expect(stored).toMatchObject({
      label: null,
      line2: null,
      notes: null,
    })
  })

  it("stores no postal code for a country without them", () => {
    const stored = normalizeAddress(
      addressSchema.parse({
        ...valid,
        country: "AE",
        postalCode: "",
        region: "Dubai",
        phone: "04 123 4567",
      })
    )

    expect(stored.postalCode).toBeNull()
  })
})

describe("addressLines", () => {
  it("prints the parts that exist, in the order of a parcel label", () => {
    expect(
      addressLines({
        fullName: "Ada Lovelace",
        line1: "1 High St",
        line2: null,
        city: "London",
        region: null,
        postalCode: "SW1A 1AA",
        country: "GB",
      })
    ).toEqual([
      "Ada Lovelace",
      "1 High St",
      "SW1A 1AA London",
      "United Kingdom",
    ])
  })

  it("falls back to the code for a country it does not know", () => {
    expect(
      addressLines({
        fullName: "A B",
        line1: "1 St",
        line2: "Flat 2",
        city: "X",
        region: "Y",
        postalCode: null,
        country: "ZZ",
      })
    ).toEqual(["A B", "1 St", "Flat 2", "X", "Y", "ZZ"])
  })
})
