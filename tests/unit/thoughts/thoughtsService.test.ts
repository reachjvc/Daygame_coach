/**
 * THE RULES OF THOUGHT FREQUENCIES — src/thoughts/thoughtsService.ts.
 */
import { describe, expect, it } from "vitest"
import {
  checkLogInput,
  checkReframeInput,
  checkSettings,
  checkThoughtText,
  isReadyToReframe,
  matchThoughts,
  needsHelpCard,
  normalizeThought,
  sortForButtons,
} from "@/src/thoughts/thoughtsService"
import { DEFAULT_SETTINGS, type Thought } from "@/src/thoughts/types"

const CPH = "Europe/Copenhagen"

function thought(text: string, over: Partial<Thought> = {}, counts: Partial<Thought["counts"]> = {}): Thought {
  return {
    id: crypto.randomUUID(),
    text,
    pinned: false,
    archived: false,
    createdAt: "2026-10-20T10:00:00.000Z",
    counts: { today: 0, week: 0, month: 0, total: 0, firstAt: null, lastAt: null, ...counts },
    reframe: null,
    reframeCount: 0,
    ...over,
  }
}

describe("normalizeThought", () => {
  it("folds case, spaces, curly quotes and end punctuation into one key", () => {
    expect(normalizeThought("I am bad")).toBe("i am bad")
    expect(normalizeThought("  I   am BAD!! ")).toBe("i am bad")
    expect(normalizeThought("i am bad.")).toBe("i am bad")
    expect(normalizeThought("“I’m bad”")).toBe("i'm bad")
  })

  it("keeps punctuation inside, so close wordings stay distinct", () => {
    expect(normalizeThought("I'm bad")).not.toBe(normalizeThought("Im bad"))
  })

  it("is empty for punctuation alone", () => {
    expect(normalizeThought(" ...!? ")).toBe("")
  })
})

describe("matchThoughts", () => {
  const bad = thought("I am bad", {}, { week: 14, total: 40 })
  const late = thought("I am always late", {}, { week: 3, total: 5 })
  const ugly = thought("Nobody likes me", {}, { week: 1, total: 2 })
  const all = [ugly, late, bad]

  it("offers the existing thought for a near-copy (\"im bad\")", () => {
    expect(matchThoughts("im bad", all)[0]).toBe(bad)
  })

  it("matches the start of each word, in order", () => {
    expect(matchThoughts("i am", all)).toEqual([bad, late])
    expect(matchThoughts("nob lik", all)).toEqual([ugly])
  })

  it("tolerates a small typo", () => {
    expect(matchThoughts("i am bda", all)[0]).toBe(bad)
  })

  it("puts an exact match first even when another is more frequent", () => {
    const rare = thought("I am", {}, { week: 0, total: 1 })
    expect(matchThoughts("I am", [...all, rare])[0]).toBe(rare)
  })

  it("matches nothing for an empty query or an unrelated one", () => {
    expect(matchThoughts("   ", all)).toEqual([])
    expect(matchThoughts("the weather is nice today", all)).toEqual([])
  })
})

describe("sortForButtons", () => {
  it("puts pinned first, then this week's most frequent, and leaves archived out", () => {
    const a = thought("a", {}, { week: 2, total: 10 })
    const b = thought("b", {}, { week: 9, total: 9 })
    const c = thought("c", { pinned: true }, { week: 0, total: 1 })
    const d = thought("d", { archived: true }, { week: 50, total: 50 })
    expect(sortForButtons([a, b, c, d]).map((t) => t.text)).toEqual(["c", "b", "a"])
  })
})

describe("isReadyToReframe", () => {
  // First logged Monday 26 Oct 23:50 CET.
  const t = thought("I am bad", {}, { firstAt: "2026-10-26T22:50:00.000Z", total: 5 })

  it("is ready on the third calendar day in the person's zone", () => {
    // Thursday 29 Oct 00:10 CET: 48h20m elapsed, but three calendar days.
    expect(isReadyToReframe(t, DEFAULT_SETTINGS, CPH, new Date("2026-10-28T23:10:00.000Z"))).toBe(true)
  })

  it("is not ready one minute before that day starts", () => {
    // Wednesday 28 Oct 23:59 CET
    expect(isReadyToReframe(t, DEFAULT_SETTINGS, CPH, new Date("2026-10-28T22:59:00.000Z"))).toBe(false)
  })

  it("follows the person's number of days", () => {
    expect(isReadyToReframe(t, { reframeAfterDays: 1 }, CPH, new Date("2026-10-27T08:00:00.000Z"))).toBe(true)
  })

  it("is never ready once reframed, when archived, or with a single log", () => {
    const now = new Date("2026-11-05T10:00:00.000Z")
    const reframe = { id: "r", thoughtId: t.id, text: "x", beliefBefore: null, beliefAfter: null, evidence: "", friend: "", createdAt: "", updatedAt: "" }
    expect(isReadyToReframe({ ...t, reframe }, DEFAULT_SETTINGS, CPH, now)).toBe(false)
    expect(isReadyToReframe({ ...t, archived: true }, DEFAULT_SETTINGS, CPH, now)).toBe(false)
    expect(isReadyToReframe({ ...t, counts: { ...t.counts, total: 1 } }, DEFAULT_SETTINGS, CPH, now)).toBe(false)
  })
})

describe("needsHelpCard", () => {
  it("opens for words about self-harm", () => {
    expect(needsHelpCard("I want to die")).toBe(true)
    expect(needsHelpCard("I should kill myself")).toBe(true)
    expect(needsHelpCard("Everyone would be better off dead without me... I'd be better off dead")).toBe(true)
    expect(needsHelpCard("thinking about suicide")).toBe(true)
  })

  it("stays closed for ordinary thoughts", () => {
    expect(needsHelpCard("I am bad")).toBe(false)
    expect(needsHelpCard("This meeting is killing me")).toBe(false)
  })
})

describe("input checks", () => {
  const now = new Date("2026-10-30T10:00:00.000Z")
  const id = "6f1c2a8e-1b2c-4d3e-8f4a-5b6c7d8e9f00"

  it("cleans a thought and refuses an empty or overlong one", () => {
    expect(checkThoughtText("  I   am bad ")).toEqual({ ok: true, value: "I am bad" })
    expect(checkThoughtText("...").ok).toBe(false)
    expect(checkThoughtText("x".repeat(281)).ok).toBe(false)
    expect(checkThoughtText(42).ok).toBe(false)
  })

  it("accepts a log with a device id and refuses one without", () => {
    const log = { id, thoughtId: id, at: now.toISOString(), source: "tap", promptId: null }
    expect(checkLogInput(log, now).ok).toBe(true)
    expect(checkLogInput({ ...log, id: "1" }, now).ok).toBe(false)
    expect(checkLogInput({ ...log, source: "voice" }, now).ok).toBe(false)
  })

  it("stores a log stamped a few minutes ahead (a fast phone clock) as now", () => {
    const checked = checkLogInput({ id, thoughtId: id, at: "2026-10-30T10:03:00.000Z", source: "tap", promptId: null }, now)
    expect(checked.ok && checked.value.at).toBe(now.toISOString())
  })

  it("refuses a thought whose folded form outgrows the limit", () => {
    // NFKC turns this one character into eighteen.
    expect(checkThoughtText("\uFDFA".repeat(20)).ok).toBe(false)
  })

  it("refuses a log from the future or more than a week old", () => {
    const log = { id, thoughtId: id, source: "tap", promptId: null }
    expect(checkLogInput({ ...log, at: "2026-10-30T10:11:00.000Z" }, now).ok).toBe(false)
    expect(checkLogInput({ ...log, at: "2026-10-23T09:59:00.000Z" }, now).ok).toBe(false)
    expect(checkLogInput({ ...log, at: "2026-10-30T10:09:00.000Z" }, now).ok).toBe(true)
  })

  it("only takes 'nothing notable' as an answer to a reminder", () => {
    const log = { id, thoughtId: null, at: now.toISOString(), source: "prompt", promptId: null }
    expect(checkLogInput(log, now).ok).toBe(false)
    expect(checkLogInput({ ...log, promptId: id }, now).ok).toBe(true)
  })

  it("requires only the new sentence of a reframe", () => {
    expect(checkReframeInput({ id, thoughtId: id, text: "I am learning" })).toEqual({
      ok: true,
      value: { id, thoughtId: id, text: "I am learning", beliefBefore: null, beliefAfter: null, evidence: "", friend: "" },
    })
    expect(checkReframeInput({ id, thoughtId: id, text: " " }).ok).toBe(false)
    expect(checkReframeInput({ id, thoughtId: id, text: "x", beliefBefore: 101 }).ok).toBe(false)
  })

  it("checks settings as a whole", () => {
    expect(checkSettings(DEFAULT_SETTINGS)).toEqual({ ok: true, value: DEFAULT_SETTINGS })
    expect(checkSettings({ ...DEFAULT_SETTINGS, intervalMinutes: 7 }).ok).toBe(false)
    expect(checkSettings({ ...DEFAULT_SETTINGS, quietStart: 600, quietEnd: 600 }).ok).toBe(false)
    expect(checkSettings({ ...DEFAULT_SETTINGS, quietStart: null, quietEnd: 480 }).ok).toBe(false)
    expect(checkSettings({ ...DEFAULT_SETTINGS, quietStart: null, quietEnd: null }).ok).toBe(true)
    expect(checkSettings({ ...DEFAULT_SETTINGS, activeDays: 0 }).ok).toBe(false)
  })
})
