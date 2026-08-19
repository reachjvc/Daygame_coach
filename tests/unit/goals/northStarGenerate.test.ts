/**
 * The generate service's pure parts.
 *
 * These exist because of one bug: the reply schemas capped string lengths, so a
 * correct answer whose sentence ran a few characters long failed the parse and
 * the route reported an error. The caps moved out of the schema and into
 * `clamp`; these tests keep them out.
 *
 * The thread schema went with the thread finder — it did not work well enough
 * to keep — so what is left covers the candidate generator, which is still
 * reachable from the area builder and the experiences list.
 */

import { describe, it, expect } from "vitest"
import { GENERATED, clamp, generateFailureReason } from "@/src/goals/northStarGenerateService"

describe("reply schemas accept an over-long string", () => {
  it("does not reject candidates whose titles overrun", () => {
    const parsed = GENERATED.safeParse({
      goals: [{ title: "t".repeat(400), because: "b".repeat(900) }],
      experiences: [],
    })
    expect(parsed.success).toBe(true)
  })

  it("still rejects a structurally wrong reply, loudly", () => {
    // Length is a display concern; shape is a correctness concern.
    expect(GENERATED.safeParse({ goals: [{ title: 42 }] }).success).toBe(false)
    expect(GENERATED.safeParse({}).success).toBe(false)
  })

  it("still bounds the list lengths, which are a real limit", () => {
    expect(GENERATED.safeParse({ goals: Array(20).fill({ title: "t", because: "b" }), experiences: [] }).success).toBe(false)
  })
})

describe("clamp", () => {
  it("leaves anything inside the limit alone, but trims whitespace", () => {
    expect(clamp("  short  ", 60)).toBe("short")
    expect(clamp("x".repeat(60), 60)).toBe("x".repeat(60))
  })

  it("cuts on a word boundary and marks the cut", () => {
    const out = clamp("the quick brown fox jumps over the lazy dog and keeps going", 24)
    expect(out.length).toBeLessThanOrEqual(25)
    expect(out.endsWith("…")).toBe(true)
    expect(out).not.toMatch(/\s…$/)
    // A boundary cut never splits a word in half.
    expect("the quick brown fox jumps over the lazy dog and keeps going").toContain(out.slice(0, -1))
  })

  it("cuts mid-word rather than throwing away most of the text", () => {
    // One very long token: a word-boundary cut would leave almost nothing, so
    // the hard cut is correct here.
    const out = clamp("a".repeat(100), 20)
    expect(out).toBe(`${"a".repeat(20)}…`)
  })
})

describe("generateFailureReason", () => {
  const cases: Array<[string, RegExp]> = [
    ["Error: spawn claude ENOENT", /Claude CLI could not be found/],
    ["Command timed out after 120000ms", /longer than two minutes/],
    ["Error: Claude CLI returned no output", /not logged in/],
    ["Model reply did not match the expected shape: Required", /shape this page could not read/],
    ["Your credit balance is too low to access the Anthropic API.", /metered key reached the CLI/],
    ["something nobody predicted", /server log has the underlying message/],
  ]

  it("names the specific fix for each failure it can recognise", () => {
    for (const [message, expected] of cases) {
      expect(generateFailureReason(new Error(message)), message).toMatch(expected)
    }
  })

  it("never tells somebody to retry a condition retrying cannot fix", () => {
    // The original bug in one line: "try again" for an unfixable-by-retry state.
    expect(generateFailureReason(new Error("spawn claude ENOENT"))).not.toMatch(/try again|again in a minute/i)
  })

  it("handles a thrown non-Error without blowing up", () => {
    expect(generateFailureReason("just a string")).toMatch(/server log/)
    expect(generateFailureReason(undefined)).toMatch(/server log/)
  })
})
