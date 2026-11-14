import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HydrationMarker } from "./HydrationMarker"

describe("HydrationMarker", () => {
  it("marks the document once it has mounted", () => {
    expect(
      document.documentElement.dataset.hydrated
    ).toBeUndefined()

    render(<HydrationMarker />)

    expect(document.documentElement.dataset.hydrated).toBe(
      "true"
    )
  })
})
