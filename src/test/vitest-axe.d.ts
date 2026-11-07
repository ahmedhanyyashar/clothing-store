// jest-axe ships Jest-namespace types only (@types/jest-axe), not Vitest's —
// this augments Vitest's Assertion interface with the matcher it registers
// via expect.extend(toHaveNoViolations) in src/test/vitest.setup.ts.
import "vitest"

declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T extends Promise<unknown>
      ? Promise<void>
      : void
  }
}
