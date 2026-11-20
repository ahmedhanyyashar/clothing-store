import { google } from "@ai-sdk/google"
import { simulateReadableStream } from "ai"
import { MockLanguageModelV4 } from "ai/test"

import { env } from "@/env"

export const DEFAULT_MODEL = "gemini-2.5-flash"

export const MOCK_REPLY =
  "This is a canned reply from the test model."

/** The assistant exists only when a provider is configured. */
export function assistantEnabled() {
  return (
    env.AI_PROVIDER === "mock" ||
    (env.AI_PROVIDER === "google" &&
      Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY))
  )
}

// A fixed-reply model for tests and the demo, so nothing reaches a provider.
function mockModel() {
  const usage = {
    inputTokens: {
      total: 3,
      noCache: 3,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: 3,
      text: 3,
      reasoning: undefined,
    },
  }
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          {
            type: "text-delta",
            id: "text-1",
            delta: MOCK_REPLY,
          },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: {
              unified: "stop",
              raw: undefined,
            },
            usage,
          },
        ],
      }),
    }),
  })
}

export function getChatModel() {
  if (!assistantEnabled()) {
    throw new Error("The assistant is not configured")
  }
  return env.AI_PROVIDER === "mock"
    ? mockModel()
    : google(env.AI_MODEL ?? DEFAULT_MODEL)
}
