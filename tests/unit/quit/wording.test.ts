import { describe, expect, it } from "vitest"
import nicotine from "@/src/quit/data/nicotine.json"
import { didYouUse, useVerb } from "@/src/quit/wording"

describe("unit wording", () => {
  it("fits every nicotine unit in the data file", () => {
    const got = Object.fromEntries(nicotine.units.map((u) => [u.id, [useVerb(u), didYouUse(u)]]))
    expect(got).toEqual({
      cigarettes: ["smoke", "Did you smoke?"],
      vape: ["vape", "Did you vape?"],
      pouches: ["use a pouch", "Did you use a pouch?"],
    })
  })
  it("falls back to plain words without a unit", () => {
    expect(useVerb(null)).toBe("use")
    expect(didYouUse(undefined)).toBe("Did you use it?")
    expect(didYouUse({ id: "unknown" })).toBe("Did you use it?")
  })
})
