import { describe, expect, it } from "vitest"
import { isUuid } from "@/src/shared/ids"

describe("isUuid", () => {
  it("accepts a uuid in either case", () => {
    expect(isUuid("3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e")).toBe(true)
    expect(isUuid("3F2B8C1E-4D5A-4B6C-8D7E-9F0A1B2C3D4E")).toBe(true)
  })
  it("refuses anything else", () => {
    expect(isUuid("not-a-uuid")).toBe(false)
    expect(isUuid(42)).toBe(false)
    expect(isUuid(null)).toBe(false)
  })
})
