import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { toHaveNoViolations } from "jest-axe"
import { afterEach, expect } from "vitest"

expect.extend(toHaveNoViolations)

// Testing Library only cleans up on its own when test globals are enabled
afterEach(() => cleanup())

// jsdom has no matchMedia, which next-themes uses to read the system theme
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})
