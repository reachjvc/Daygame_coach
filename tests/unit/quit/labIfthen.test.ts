import { describe, expect, it } from "vitest"
import { LAB } from "@/src/quit/lab/registry"
import { isAddictionId } from "@/src/quit/menu"
import { EMPTY_PLAN, hasContent, parseScale } from "@/src/quit/lab/ifthen/c/logic"

describe("ifthen registry", () => {
  it("has copies a, b, c and the improved variant with valid addictions", () => {
    expect(Object.keys(LAB.ifthen.variants)).toEqual(["a", "b", "c", "best"])
    for (const v of Object.values(LAB.ifthen.variants)) {
      expect(v.kind).toBe(v === LAB.ifthen.variants.best ? "best" : "copy")
      expect(isAddictionId(v.addiction)).toBe(true)
    }
    expect(LAB.ifthen.variants.a.label).toBe("Copy A")
  })
})

describe("worksheet number boxes", () => {
  it("accept 1 to 10 and empty only", () => {
    expect(parseScale("", "4")).toBe("")
    expect(parseScale("7", "")).toBe("7")
    expect(parseScale("10", "1")).toBe("10")
    expect(parseScale("11", "1")).toBe("1")
    expect(parseScale("0", "5")).toBe("5")
    expect(parseScale("-3", "5")).toBe("5")
    expect(parseScale("2.5", "5")).toBe("5")
    expect(parseScale("abc", "")).toBe("")
  })
  it("starts empty", () => {
    expect(hasContent(EMPTY_PLAN)).toBe(false)
    expect(hasContent({ ...EMPTY_PLAN, helpers: [{ person: "x", help: "" }] })).toBe(true)
  })
})
