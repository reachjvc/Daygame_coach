import { existsSync, readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { addictionFromParam, catchText, formatUsd, priceText, stepsText, yearlyCost } from "@/src/quit/coaching"
import { getAddiction } from "@/src/quit/data"
import { canBuy } from "@/src/quit/offer"
import { isAddictionId } from "@/src/quit/menu"
import { visibleItems, privacyDoc } from "@/src/quit/privacyText"
import { QUIT_ADDICTION_IDS } from "@/src/quit/types"

afterEach(() => vi.resetModules())

describe("offer and page rules", () => {
  it("no payment link: no buy button, and the page source only links Stripe through canBuy", () => {
    expect(canBuy()).toBe(false)
    const page = readFileSync("app/quit/coaching/page.tsx", "utf8")
    expect(page).toContain("canBuy() ?")
  })
  it("donation line shows only when non-null (page guards it)", () => {
    const page = readFileSync("app/quit/coaching/page.tsx", "utf8")
    expect(page).toContain("offer.donationLine !== null &&")
  })
  it("formats price from the offer and fills the days", () => {
    expect(priceText()).toBe("$200")
    expect(stepsText()[1]).toContain("30 days")
    expect(formatUsd(1234.6)).toBe("$1,235")
  })
  it("uses no countdown or scarcity words", () => {
    const text = JSON.stringify(stepsText()) + readFileSync("src/quit/data/tooltext.json", "utf8")
    expect(text).not.toMatch(/spots? left|countdown|hurry|only \d+ left/i)
  })
})

describe("cost line from the store", () => {
  it("reads quit-v1[a].cost.result.yearUsd", () => {
    expect(yearlyCost({ result: { yearUsd: 1825, tenYearUsd: 18250, hoursYear: null } })).toBe(1825)
  })
  it.each([[undefined], [null], ["x"], [{}], [{ result: {} }], [{ result: { yearUsd: "5" } }], [{ result: { yearUsd: -1 } }], [{ result: { yearUsd: NaN } }]])(
    "ignores %j",
    (v) => expect(yearlyCost(v)).toBeNull(),
  )
})

describe("catch paragraph", () => {
  it("treats TODO as absent", () => {
    expect(catchText("weed", true)).toBeNull()
  })
  it("returns the text once the file has it", () => {
    expect(catchText("nicotine")).toBe(getAddiction("nicotine")?.catch)
  })
  it("is absent for an addiction that is not viewable", () => {
    expect(catchText("gambling")).toBeNull()
  })
})

describe("route", () => {
  it("coaching is a static segment and not an addiction id", () => {
    expect(existsSync("app/quit/coaching/page.tsx")).toBe(true)
    expect(isAddictionId("coaching")).toBe(false)
    expect(QUIT_ADDICTION_IDS as readonly string[]).not.toContain("coaching")
  })
  it("?a= falls back to nicotine", () => {
    expect(addictionFromParam(undefined)).toBe("nicotine")
    expect(addictionFromParam("coaching")).toBe("nicotine")
    expect(addictionFromParam("weed")).toBe("weed")
    expect(addictionFromParam(["porn", "weed"])).toBe("porn")
  })
})

describe("privacy text", () => {
  it("every sentence carries a factRef", () => {
    for (const s of privacyDoc.sections) for (const i of s.items) expect(i.factRef.length).toBeGreaterThan(5)
  })
  it("deletion with no email says to ask through coaching; with email it names the address", () => {
    const del = privacyDoc.sections.find((s) => s.id === "delete")!
    const none = visibleItems(del.items, null)
    expect(none.some((i) => i.isAsk)).toBe(true)
    expect(none.some((i) => i.text.includes("{email}"))).toBe(false)
    const withMail = visibleItems(del.items, "a@b.co")
    expect(withMail.some((i) => i.text.includes("a@b.co"))).toBe(true)
    expect(withMail.some((i) => i.isAsk)).toBe(false)
  })
  it("has the five sections and the draft line", () => {
    expect(privacyDoc.sections.map((s) => s.id)).toEqual(["phone", "account", "never", "processors", "delete"])
    expect(privacyDoc.draftLine).toBe("Draft, 2026-11-18. Not legal advice.")
  })
})
