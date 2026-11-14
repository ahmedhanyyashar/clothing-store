import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

// The variable list is written in several files. This keeps the template and
// the test values from drifting away from the schema in src/env.ts.
const read = (file: string) => readFileSync(file, "utf8")

const keysOf = (text: string, pattern: RegExp) =>
  new Set([...text.matchAll(pattern)].map((m) => m[1]))

// every variable the app reads is listed in `runtimeEnv`
const schema = keysOf(
  read("src/env.ts").split("runtimeEnv:")[1],
  /^\s+([A-Z][A-Z0-9_]*):/gm
)
// active or commented-out (optional) lines of a dotenv file
const dotenv = (file: string) =>
  keysOf(read(file), /^#?\s*([A-Z][A-Z0-9_]*)=/gm)

describe("environment files", () => {
  it("reads the schema keys", () => {
    expect(schema.size).toBeGreaterThan(0)
  })

  it(".env.example documents exactly the schema", () => {
    expect([...dotenv(".env.example")].sort()).toEqual(
      [...schema].sort()
    )
  })

  it(".env.test sets only variables the schema knows", () => {
    const unknown = [...dotenv(".env.test")].filter(
      (key) => !schema.has(key)
    )
    expect(unknown).toEqual([])
  })

  it("production wires every required variable", () => {
    const declared =
      read("src/env.ts").split("runtimeEnv:")[0]
    // one chunk per variable, from its name up to the next one
    const required = declared
      .split(/^\s+(?=[A-Z][A-Z0-9_]*: z)/m)
      .slice(1)
      .filter((chunk) => !chunk.includes(".optional()"))
      .map((chunk) => chunk.slice(0, chunk.indexOf(":")))
    const service = read("infra/compute/service.ts")
    const unwired = required.filter(
      (key) => !service.includes(`"${key}"`)
    )
    expect(required.length).toBeGreaterThan(5)
    expect(unwired).toEqual([])
  })
})
