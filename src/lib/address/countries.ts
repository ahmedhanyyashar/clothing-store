export const COUNTRY_CODES = [
  "US",
  "CA",
  "GB",
  "IE",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "AU",
  "AE",
  "SA",
  "EG",
] as const

export type CountryCode = (typeof COUNTRY_CODES)[number]

export type CountryInfo = {
  name: string
  /** Tested against the postal code after it is trimmed and upper-cased. Null where there are none. */
  postalCode: { pattern: RegExp; example: string } | null
  regionLabel: string
  regionRequired: boolean
  /** A fixed list to choose from. Without one, the region is free text. */
  regions?: readonly string[]
}

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const

const CA_PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
] as const

const AU_STATES = [
  "Australian Capital Territory",
  "New South Wales",
  "Northern Territory",
  "Queensland",
  "South Australia",
  "Tasmania",
  "Victoria",
  "Western Australia",
] as const

const fiveDigits = { pattern: /^\d{5}$/ }

// The annotation makes the compiler reject a code that has no entry here.
export const COUNTRIES: Record<CountryCode, CountryInfo> = {
  US: {
    name: "United States",
    postalCode: {
      pattern: /^\d{5}(-\d{4})?$/,
      example: "90210",
    },
    regionLabel: "State",
    regionRequired: true,
    regions: US_STATES,
  },
  CA: {
    name: "Canada",
    postalCode: {
      pattern: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/,
      example: "K1A 0B1",
    },
    regionLabel: "Province",
    regionRequired: true,
    regions: CA_PROVINCES,
  },
  GB: {
    name: "United Kingdom",
    postalCode: {
      pattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/,
      example: "SW1A 1AA",
    },
    regionLabel: "County",
    regionRequired: false,
  },
  IE: {
    name: "Ireland",
    postalCode: {
      pattern: /^[A-Z]\d{2} ?[A-Z\d]{4}$/,
      example: "D02 X285",
    },
    regionLabel: "County",
    regionRequired: false,
  },
  DE: {
    name: "Germany",
    postalCode: { ...fiveDigits, example: "10115" },
    regionLabel: "State",
    regionRequired: false,
  },
  FR: {
    name: "France",
    postalCode: { ...fiveDigits, example: "75001" },
    regionLabel: "Region",
    regionRequired: false,
  },
  ES: {
    name: "Spain",
    postalCode: { ...fiveDigits, example: "28013" },
    regionLabel: "Province",
    regionRequired: false,
  },
  IT: {
    name: "Italy",
    postalCode: { ...fiveDigits, example: "00184" },
    regionLabel: "Province",
    regionRequired: false,
  },
  NL: {
    name: "Netherlands",
    postalCode: {
      pattern: /^\d{4} ?[A-Z]{2}$/,
      example: "1012 AB",
    },
    regionLabel: "Province",
    regionRequired: false,
  },
  AU: {
    name: "Australia",
    postalCode: { pattern: /^\d{4}$/, example: "2000" },
    regionLabel: "State or territory",
    regionRequired: true,
    regions: AU_STATES,
  },
  AE: {
    name: "United Arab Emirates",
    postalCode: null,
    regionLabel: "Emirate",
    regionRequired: false,
  },
  SA: {
    name: "Saudi Arabia",
    postalCode: {
      pattern: /^\d{5}(-\d{4})?$/,
      example: "12211",
    },
    regionLabel: "Province",
    regionRequired: false,
  },
  EG: {
    name: "Egypt",
    postalCode: { ...fiveDigits, example: "11511" },
    regionLabel: "Governorate",
    regionRequired: false,
  },
}

export function isCountryCode(
  value: string
): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(
    value
  )
}

/** Trimmed, upper-cased, with runs of spaces collapsed: the form postal codes are compared and stored in. */
export function normalizePostalCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ")
}
