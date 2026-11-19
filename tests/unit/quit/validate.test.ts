import { spawnSync } from "node:child_process"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { getAddiction, isLive, liveIds } from "@/src/quit/data"
import { canBuy, getOffer } from "@/src/quit/offer"
import { digitRuns, validateAddiction, validateLive } from "@/src/quit/validate"
import type { QuitAddictionFull } from "@/src/quit/types"
import { makeValid } from "./fixtures/valid"

const rules = (d: unknown) => [...new Set(validateAddiction(d, { live: true }).map((i) => i.rule))]

describe("live files", () => {
  it("live.json lists nicotine and validateLive finds nothing", () => {
    expect(liveIds()).toEqual(["nicotine"])
    expect(isLive("nicotine")).toBe(true)
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
    ["n-in-quote", (d) => void (d.beliefs[0].n = "469 heart patients")],
    ["n-in-quote", (d) => void ((d.facts[0] as { n?: string }).n = "16 trials, 12,169 people")],
    ["moment-swaps", (d) => void (d.momentSwaps = [{ momentId: d.riskyMoments[0].id, cards: ["one", "two"] }])],
    ["moment-swaps", (d) => void (d.momentSwaps = [{ momentId: d.riskyMoments[0].id, cards: ["one", "two", "three"] }, { momentId: "nope", cards: ["a", "b", "c"] }])],
  ]

  for (const [rule, mutate] of cases) {
    it(`breaking only "${rule}" fires exactly that rule`, () => {
      const d = makeValid()
      mutate(d)
      expect(rules(d)).toEqual([rule])
    })
  }

  it("n passes when each number is in a quote, commas and spaces between digits removed", () => {
    const d = makeValid()
    d.beliefs[0].refs = [{ ...d.beliefs[0].refs[0], quote: "469 smokers; 12,169 participants in 16 studies" }]
    d.beliefs[0].n = "469 people, 12 169 in 16 studies"
    expect(rules(d)).toEqual([])
    d.beliefs[0].n = "Not stated"
    expect(rules(d)).toEqual([])
    d.beliefs[1].n = "12169 people"
    expect(rules(d)).toEqual(["n-in-quote"])
  })

  it("digitRuns joins digits split by a comma or space", () => {
    expect(digitRuns("12,169 and 3 609 and 8.1")).toEqual(["12169", "3609", "8", "1"])
  })

  it("every nicotine risky moment has exactly three cards, none left over", () => {
    const nic = getAddiction("nicotine")! as unknown as QuitAddictionFull
    const ids = (nic.riskyMoments as { id: string }[]).map((m) => m.id)
    expect(nic.momentSwaps.map((s) => s.momentId)).toEqual(ids)
    for (const s of nic.momentSwaps) expect(s.cards).toHaveLength(3)
    for (const id of ["alcohol", "weed", "porn"] as const) expect((getAddiction(id) as unknown as QuitAddictionFull).momentSwaps).toEqual([])
  })

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
