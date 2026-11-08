import { afterEach, describe, expect, it, vi } from "vitest"

import { logger } from "./logger"

afterEach(() => vi.restoreAllMocks())

function lastLine(stream: "stdout" | "stderr") {
  const write = vi
    .spyOn(process[stream], "write")
    .mockImplementation(() => true)
  return () =>
    JSON.parse(String(write.mock.calls.at(-1)?.[0]))
}

describe("logger", () => {
  it("writes one JSON line, with an error's name, message and stack", () => {
    const read = lastLine("stderr")

    logger.error(
      "could not pay",
      new Error("card declined")
    )

    const line = read()
    expect(line).toMatchObject({
      level: "error",
      message: "could not pay",
    })
    expect(line.details[0]).toMatchObject({
      name: "Error",
      message: "card declined",
    })
    expect(line.details[0].stack).toContain("card declined")
  })

  it("sends info and warnings to stdout, and survives what cannot be serialised", () => {
    const read = lastLine("stdout")
    const loop: Record<string, unknown> = {}
    loop.self = loop

    logger.warn("odd", loop)

    expect(read()).toMatchObject({
      level: "warn",
      message: "odd",
    })
  })
})
