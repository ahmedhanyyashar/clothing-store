import { describe, expect, it } from "vitest"

import { escapeLike } from "./like"

describe("escapeLike", () => {
  it.each([
    ["plain", "plain"],
    ["100%", "100\\%"],
    ["a_b", "a\\_b"],
    ["back\\slash", "back\\\\slash"],
    ["%_\\", "\\%\\_\\\\"],
  ])("turns %s into %s", (input, expected) => {
    expect(escapeLike(input)).toBe(expected)
  })
})
