import { randomInt } from "node:crypto"

// No 0, 1, I, L or O: a number read out over the phone or copied by hand
// cannot be mistaken. 31 symbols over 8 places is about 850 billion numbers.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
const LENGTH = 8

/** A random, readable order number such as CS-7K2M9QXD. It says nothing about how many orders exist. */
export function generateOrderNumber() {
  let code = ""
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)]
  }
  return `CS-${code}`
}

export const ORDER_NUMBER_PATTERN =
  /^CS-[2-9A-HJKMNP-Z]{8}$/
