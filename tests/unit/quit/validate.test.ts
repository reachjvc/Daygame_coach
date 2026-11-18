import { spawnSync } from "node:child_process"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { getAddiction, isLive, liveIds } from "@/src/quit/data"
import { canBuy, getOffer } from "@/src/quit/offer"
import { validateAddiction, validateLive } from "@/src/quit/validate"
import type { QuitAddictionFull } from "@/src/quit/types"
import { makeValid } from "./fixtures/valid"

const rules = (d: unknown) => [...new Set(validateAddiction(d, { live: true }).map((i) => i.rule))]

describe("live files", () => {
  it("live.json is empty and validateLive finds nothing", () => {
    expect(liveIds()).toEqual([])
    expect(isLive("nicotine")).toBe(false)
    expect(validateLive()).toEqual([])
  })

  it("the finished nicotine file passes every rule as live", () => {
    expect(validateAddiction(getAddiction("nicotine"), { live: true })).toEqual([])
  })

  it("a draft file fails as live, naming each TODO", () => {
    const issues = validateAddiction(getAddiction("weed"), { live: true })
    const todo = issues.filter((i) => i.rule === "todo")
    const paths = todo.map((i) => i.path)
    for (const p of ["beliefs[0].need", "needs", "lessons", "catch", "units", "symptomCourse"]) expect(paths).toContain(p)
    for (const i of todo) expect(i.message).toContain(i.path)
  })

  it("a draft file reports no TODO when not live", () => {
    const issues = validateAddiction(getAddiction("weed"), { live: false })
    expect(issues.filter((i) => i.rule === "todo")).toEqual([])
  })
})

describe("rules, one at a time on a valid fixture", () => {
  it("the fixture passes every rule", () => {
    expect(validateAddiction(makeValid(), { live: true })).toEqual([])
  })

  const cases: [string, (d: QuitAddictionFull) => void][] = [
    ["todo", (d) => void (d.catch = "TODO")],
    ["words", (d) => void (d.beliefs[0].scene = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen")],
    ["basis", (d) => void (d.beliefs[0].refs = [])],
    ["basis", (d) => void d.beliefs.pop()],
    ["basis", (d) => void (d.units[0].priceRefs = [])],
    ["basis", (d) => void (d.numbers[0].basis.who = "")],
    ["basis", (d) => void (d.needs[0].swaps[0].refs = [])],
    ["counted-words", (d) => void (d.beliefs[0].counted = "people in general")],
    ["screening", (d) => void (d.catch = "Does this sound like you?")],
    ["cheer", (d) => void (d.catch = "You can do it")],
    ["cheer", (d) => void (d.catch = "Great work!")],
    ["founder", (d) => void (d.lessons[0].body = "When I stopped, tea tasted worse.")],
    ["dollar", (d) => void (d.catch = "It costs $5 a week.")],
    ["moderation", (d) => void (d.beliefs[0].limiting = "Just one cup is fine.")],
    ["danger", (d) => void (d.danger = { level: "none", line: "See a doctor.", refs: [] })],
    ["forecast", (d) => void (d.endings[0].label = "You will succeed")],
    ["do-not-avoid", (d) => void (d.responses[0].text = "Won't have a cup.")],
    ["no-reset", (d) => void (d.catch = "A slip is not a reset.")],
    ["toll", (d) => void (d.numbers[0].caveat = "Millions of people.")],
  ]

  for (const [rule, mutate] of cases) {
    it(`breaking only "${rule}" fires exactly that rule`, () => {
      const d = makeValid()
      mutate(d)
      expect(rules(d)).toEqual([rule])
    })
  }

  it("founder voice is allowed in the reader's own lines", () => {
    const d = makeValid()
    d.beliefs[0].limiting = "When I stop I will fail."
    d.responses[0].text = "I go for a walk when I want one."
    expect(validateAddiction(d, { live: true })).toEqual([])
  })

  it("a price with a source is fine; a null price needs none", () => {
    const d = makeValid()
    d.units[0].defaultPriceUsd = null
    d.units[0].priceRefs = []
    expect(validateAddiction(d, { live: true })).toEqual([])
  })
})

describe("importer and offer", () => {
  it("import-v3 --check finds no difference", () => {
    const r = spawnSync("node", ["scripts/quit/import-v3.mjs", "--check"], {
      cwd: path.resolve(__dirname, "../../.."),
      env: { ...process.env, NODE_ENV: "test" },
      encoding: "utf8",
    })
    expect(r.stderr).toBe("")
    expect(r.status).toBe(0)
  })

  it("import-v3 skips a file that has no TODO", () => {
    const r = spawnSync("node", ["scripts/quit/import-v3.mjs", "--check"], {
      cwd: path.resolve(__dirname, "../../.."),
      env: { ...process.env, NODE_ENV: "test" },
      encoding: "utf8",
    })
    expect(r.stdout).toContain("skipped nicotine: filled")
    expect(r.stdout).not.toContain("skipped weed")
  })

  it("canBuy is false while there is no payment link", () => {
    expect(getOffer().paymentLinkUrl).toBeNull()
    expect(canBuy()).toBe(false)
  })
})
