import { describe, expect, it } from "vitest"
import frame from "@/src/quit/data/frame.json"
import menu from "@/src/quit/data/menu.json"
import tooltext from "@/src/quit/data/tooltext.json"
import { checkedTag, clampScreen } from "@/src/quit/tools/common"
import { CHEER, FORECAST, FOUNDER, NO_RESET, SCREEN } from "@/src/quit/validate"
import { SEVERITIES } from "@/src/quit/types"

describe("checkedTag (RULEBOOK rules 2 and 3)", () => {
  it("`checked` decides when present", () => {
    expect(checkedTag({ checked: "hooked", severity: "users" })).toBe("hooked")
    expect(checkedTag({ checked: "not", severity: "dependent" })).toBe("not")
  })

  it("else dependent, disorder, treatment, resolved are hooked", () => {
    for (const severity of ["dependent", "disorder", "treatment", "resolved"] as const) expect(checkedTag({ severity })).toBe("hooked")
  })

  it("else self-hooked, heavy, users, screened are not checked", () => {
    for (const severity of ["self-hooked", "heavy", "users", "screened"] as const) expect(checkedTag({ severity })).toBe("not")
  })

  it("covers every severity", () => {
    for (const severity of SEVERITIES) expect(["hooked", "not"]).toContain(checkedTag({ severity }))
  })
})

describe("clampScreen", () => {
  it("lands on the first unanswered screen for a missing, bad or too-high s", () => {
    expect(clampScreen(null, 7, 15)).toBe(7)
    expect(clampScreen("abc", 7, 15)).toBe(7)
    expect(clampScreen("99", 7, 15)).toBe(7)
    expect(clampScreen("0", 7, 15)).toBe(7)
  })
  it("keeps a valid earlier screen and allows the result screen", () => {
    expect(clampScreen("3", 7, 15)).toBe(3)
    expect(clampScreen("16", 40, 15)).toBe(16)
    expect(clampScreen("17", 40, 15)).toBe(16)
  })
})

/** Every string of a JSON value. */
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") out.push(x)
  else if (Array.isArray(x)) x.forEach((v) => strings(v, out))
  else if (x && typeof x === "object") Object.values(x).forEach((v) => strings(v, out))
  return out
}

describe("reader text rules over the UI text files", () => {
  const files = { "tooltext.json": tooltext, "menu.json": menu, "frame.json": frame }
  const rules = { SCREEN, CHEER, FOUNDER, FORECAST, NO_RESET }

  for (const [file, json] of Object.entries(files)) {
    const all = strings(json)
    it(`${file} has text to check`, () => {
      expect(all.length).toBeGreaterThan(5)
    })
    for (const [name, re] of Object.entries(rules)) {
      it(`${file} passes ${name}`, () => {
        expect(all.filter((s) => re.test(s))).toEqual([])
      })
    }
  }
})
