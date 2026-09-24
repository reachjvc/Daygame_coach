import { describe, it, expect } from "vitest"
import { RESPOND } from "@/src/vice/data/copy"

/**
 * THE ORDER OF THE FOUR URGE RESPONSES IS A RESEARCH FINDING, NOT A LAYOUT.
 *
 * The module's earlier design offered one response: watch the urge for ninety
 * seconds. That is urge surfing, and the corpus is unkind to it as a sole
 * option — nearly absent from the largest peer community at four mentions
 * against ten for playing the tape forward, reported as *extending* the urge,
 * reported as too fast to observe at all, and a practitioner who teaches it
 * saying that in a cue-rich room the skilful move is to direct attention AWAY.
 *
 * So: four responses, the two attention-away ones first, watching last and
 * still present. `RESPOND` in `data/copy.ts` carries that order and the reason.
 *
 * ----------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL, which is the useful part.
 *
 * `UrgeNow` used to sort watching to the end when the room was cue-rich. That
 * sort was DEAD CODE — the data already ends with watching, so it never moved
 * anything — and the browser test written to prove the reordering passed with
 * the sort deleted. A guard green against its own subject's absence is no
 * guard. The sort is gone and the guarantee is asserted here, on the data that
 * actually holds it, where deleting it fails.
 */
describe("the four urge responses", () => {
  it("offers exactly four, because 'pick what fits' is the whole design", () => {
    expect(RESPOND.options.map((o) => o.id)).toEqual(["tape", "out", "move", "watch"])
  })

  it("puts the two attention-away responses first", () => {
    // Playing the tape forward and leaving the room both move attention off
    // the urge. In a cue-rich room that is the cited move, and these are the
    // two `cueRichNote` means when it says "the first two below do that".
    expect(RESPOND.options.slice(0, 2).map((o) => o.id)).toEqual(["tape", "out"])
    expect(RESPOND.cueRichNote).toContain("first two below")
  })

  it("keeps watching last, and keeps it", () => {
    const ids = RESPOND.options.map((o) => o.id)
    expect(ids[ids.length - 1], "watching is not last").toBe("watch")
    expect(ids, "watching was removed — people credit it and it stays").toContain("watch")
  })

  it("gives every response its basis, so none reads as invented", () => {
    for (const o of RESPOND.options) {
      expect(o.basis.length, `${o.id} has no basis`).toBeGreaterThan(20)
      expect(o.help.length, `${o.id} has no instruction`).toBeGreaterThan(20)
    }
  })

  it("asks about the room before offering anything", () => {
    // The steer depends on the answer, so the question cannot come after it.
    expect(RESPOND.whereQuestion).toMatch(/where are you/i)
    expect(RESPOND.whereOptions.filter((o) => o.cueRich).length).toBeGreaterThan(0)
    expect(RESPOND.whereOptions.filter((o) => !o.cueRich).length).toBeGreaterThan(0)
  })
})
