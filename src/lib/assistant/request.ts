import { z } from "zod"

/** Messages one request may carry; also bounds a tool-call loop in the browser. */
export const MAX_MESSAGES = 40
/** Characters in one message a shopper types. */
export const MAX_TEXT_LENGTH = 1000
export const MAX_OUTPUT_TOKENS = 1024
/** Model calls in one request. */
export const MAX_STEPS = 5

export const USER_LIMIT = 30
export const VISITOR_LIMIT = 10
export const WINDOW_MS = 5 * 60 * 1000

export const requestSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  messages: z.array(z.unknown()).min(1).max(MAX_MESSAGES),
})

/** True when a message the shopper typed is longer than allowed. */
export function hasOversizedText(
  messages: {
    role: string
    parts: { type: string; text?: string }[]
  }[]
) {
  return messages.some(
    (message) =>
      message.role === "user" &&
      message.parts.some(
        (part) =>
          part.type === "text" &&
          (part.text?.length ?? 0) > MAX_TEXT_LENGTH
      )
  )
}
