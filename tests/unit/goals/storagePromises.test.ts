/**
 * A PROMISE ABOUT WHERE YOUR WRITING GOES, CHECKED AGAINST WHERE IT GOES.
 *
 * The Track step told a SIGNED-IN person "Everything up to here saved on this
 * device only" — on the one step whose entire job is explaining what reaches
 * the account. It was true when it was written. Phase 1 put the plan on the
 * account and M1 put the day half there, and the sentence stayed: falsified by
 * commits in other files, and caught by nothing.
 *
 * Nothing could have caught it. `lifeMasteryCopyLint` reads this exact file on
 * every run and checks the VOICE — banned machine phrasing, word budgets — not
 * whether a claim is still true. The same shape has already been paid for twice
 * in this repo: the flow's header said "Everything saves as you type" while the
 * whole day half was browser-only (M0 removed it), and the vice module's report
 * form said "Nothing is sent anywhere" for three days after the account landed.
 * Three surfaces, three slices, one failure: prose that states a fact about
 * storage, in a file that never changes when the storage does.
 *
 * So the rule this pins is narrow enough to be true and broad enough to bite:
 * **copy shown to somebody SIGNED IN may not claim their writing is device-only.**
 * Signed out it is device-only and saying so is correct — those keys are named
 * `signedOut` and are the exception, by name rather than by a list that rots.
 *
 * It cannot prove a promise is true. It can prove this particular false one
 * cannot come back, and that the next person to write "stays in this browser"
 * onto a signed-in surface has to answer for it.
 */

import { describe, it, expect } from "vitest"
import { TODAY_COPY, TRACK_COPY, SCHEDULE_COPY, JOURNAL_COPY, SEASON_BAND_COPY } from "@/src/goals/data/northStar"

/**
 * Phrases that claim the writing does not leave the machine.
 *
 * Deliberately about STORAGE and not about the word "device": "kept when you
 * open the app on your phone" is a promise in the other direction and must not
 * trip this.
 */
const DEVICE_ONLY = [
  /on this device only/i,
  /only on this device/i,
  /stays in this browser/i,
  /nothing is sent/i,
  /not on the account/i,
  /in this browser, not/i,
]

/** The copy blocks a signed-in person reads on the Life Mastery surfaces. */
const BLOCKS: Array<[string, Record<string, unknown>]> = [
  ["TODAY_COPY", TODAY_COPY],
  ["TRACK_COPY", TRACK_COPY],
  ["SCHEDULE_COPY", SCHEDULE_COPY],
  ["JOURNAL_COPY", JOURNAL_COPY],
  ["SEASON_BAND_COPY", SEASON_BAND_COPY],
]

/** Every string in a copy block, with the key it sits under. */
function strings(block: Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const [key, value] of Object.entries(block)) {
    if (typeof value === "string") out.push([key, value])
    // A nested block of words, e.g. a noun pair; a function is copy for a
    // number and is covered by the word-budget test rather than here.
    else if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === "string") out.push([`${key}.${k}`, v])
      }
    }
  }
  return out
}

describe("what the Life Mastery copy claims about where your writing goes", () => {
  it("never tells a signed-in person their work is device-only", () => {
    const lies: string[] = []
    for (const [name, block] of BLOCKS) {
      for (const [key, text] of strings(block)) {
        // Signed-out copy is the exception and says so in its own name: with no
        // account to write to, "this device" is exactly right.
        if (/signedout/i.test(key)) continue
        for (const phrase of DEVICE_ONLY) {
          if (phrase.test(text)) lies.push(`${name}.${key}: ${text.slice(0, 120)}`)
        }
      }
    }

    expect(
      lies,
      "These are read by somebody signed in, whose plan and whose day half are\n" +
        "BOTH on the account since Phase 1 and M1. If one of these is true again,\n" +
        "the storage changed and this sentence is the last place that knows:\n" +
        lies.join("\n"),
    ).toEqual([])
  })

  /**
   * THE EXCEPTION HAS TO STILL BE THERE, or the rule above is passing because
   * the honest signed-out copy was deleted rather than because the dishonest
   * signed-in copy was fixed. An allowlist nobody can be sure is still used is
   * how a guard becomes decorative.
   */
  it("and the signed-out copy still says device-only, because there it is true", () => {
    expect(TODAY_COPY.signedOut, "ticks really do stay put with no account to send them to").toMatch(
      /this device/i,
    )
    expect(TRACK_COPY.signedOut).toMatch(/not on the account/i)
  })

  /**
   * The specific sentence, named. A regex family can be satisfied by rewording
   * around it; this asserts the claim that was actually wrong is actually gone.
   */
  it("does not tell you on the Track step that the plan is only here", () => {
    expect(TRACK_COPY.help).not.toMatch(/saved on this device/i)
    expect(TRACK_COPY.help, "and it still says what the step IS for").toMatch(/counted/i)
  })
})
