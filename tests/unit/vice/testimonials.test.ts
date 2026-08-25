/**
 * Integrity rules for the testimonial library.
 *
 * These are not style checks. Every entry in this file is a real disclosure by
 * a real person about their drinking, drug use or gambling, shown to somebody
 * who is deciding whether they have the same problem. Three things follow, and
 * each has a test here:
 *
 *   1. **Nothing unattributed.** A quote without a source is indistinguishable
 *      from one a marketing team wrote, and a reader is right to discount the
 *      whole page on finding one. During gathering, the page-fetch layer was
 *      caught inventing a quote that did not exist in its source — so the link
 *      is the only thing standing between this file and that failure mode.
 *   2. **Nothing that identifies a private individual.**
 *   3. **Nothing we are not licensed to ship.** Recovery Dharma is CC BY-NC and
 *      cannot appear in a paid product; it is the most openly licensed source
 *      in the corpus, which makes it the most likely to be reached for.
 */

import { describe, it, expect } from "vitest"
import { SURVIVORSHIP, TESTIMONIALS, testimonialsFor } from "@/src/vice/data/testimonials"
import { LANGUAGE_RULES } from "@/src/vice/data/copy"

describe("every testimonial can be checked by a reader", () => {
  it("has a working-shaped URL and a source, without exception", () => {
    // The link is the non-negotiable part: it is what lets a reader check a
    // quote, and what stands between this file and the fabricated-quote
    // failure mode the corpus caught during gathering.
    for (const t of TESTIMONIALS) {
      expect(t.url, t.id).toMatch(/^https:\/\/\S+$/)
      expect(t.url, t.id).not.toContain(" ")
      expect(t.source.trim().length, t.id).toBeGreaterThan(0)
    }
  })

  it("has a well-formed date wherever one was recoverable, and mostly has one", () => {
    // A missing date is a gap in the record, not a broken citation — the URL
    // still resolves. But a set where most entries lack one would mean the
    // extraction went wrong, so hold a floor.
    const dated = TESTIMONIALS.filter((t) => t.date.trim().length > 0)
    for (const t of dated) expect(t.date.trim(), t.id).toMatch(/^\d{4}(-\d{2}(-\d{2})?)?$/)
    expect(dated.length / TESTIMONIALS.length).toBeGreaterThan(0.75)
  })

  it("attributes to a pseudonym, or explicitly withholds it", () => {
    for (const t of TESTIMONIALS) {
      // null is a deliberate signal — the account was deleted, which we treat
      // as a withdrawal. It is never a missing field.
      if (t.handle !== null) expect(t.handle.trim().length, t.id).toBeGreaterThan(0)
    }
  })

  it("uses no unique ids twice", () => {
    const ids = TESTIMONIALS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("quotes something substantial enough to be worth showing", () => {
    for (const t of TESTIMONIALS) {
      expect(t.quote.trim().length, t.id).toBeGreaterThan(40)
      // Long enough to be an unlicensed reproduction rather than a quotation.
      expect(t.quote.length, t.id).toBeLessThan(600)
    }
  })
})

describe("privacy and licensing", () => {
  it("ships nothing from a NonCommercial source", () => {
    // Recovery Dharma is CC BY-NC. It is research-only and must never leak
    // into a product file.
    for (const t of TESTIMONIALS) {
      expect(`${t.source} ${t.url}`.toLowerCase(), t.id).not.toContain("recoverydharma")
      expect(`${t.source} ${t.url}`.toLowerCase(), t.id).not.toContain("recovery dharma")
    }
  })

  it("carries no obvious real-name attribution for a forum account", () => {
    for (const t of TESTIMONIALS) {
      if (t.handle === null) continue
      const looksRedditish = t.source.startsWith("r/")
      // Forum handles are u/... by convention. A "Firstname Lastname" on a
      // forum quote is the shape a deanonymisation would take.
      if (looksRedditish) expect(t.handle, t.id).toMatch(/^u\//)
    }
  })
})

describe("the set is honest rather than flattering", () => {
  it("says so on the page about survivorship bias", () => {
    expect(SURVIVORSHIP.toLowerCase()).toContain("stop posting")
    expect(SURVIVORSHIP.length).toBeGreaterThan(80)
  })

  it("includes accounts of things not working", () => {
    // A library where everything worked is an advert. The gambling
    // self-exclusion account is here precisely because it corrects the module.
    const corrective = TESTIMONIALS.filter(
      (t) => t.stages.includes("lapse") || t.stages.includes("goodStretch"),
    )
    expect(corrective.length).toBeGreaterThanOrEqual(4)
  })

  it("covers the good stretch, which is the moment everything else misses", () => {
    // Eight independent sources say the hazard is feeling fine, not craving.
    expect(testimonialsFor("goodStretch", null).length).toBeGreaterThanOrEqual(3)
  })

  it("has something for a first-time visitor mid-urge, with no vice picked", () => {
    // The cold-start case. Before this library existed, that person got a bare
    // ninety-second countdown and nothing else.
    expect(testimonialsFor("urge", null).length).toBeGreaterThan(0)
  })
})

describe("our own words around the quotes follow the module's copy rules", () => {
  it("keeps controlling language and machine phrasing out of the framing copy", () => {
    const control = new RegExp(`\\b(${LANGUAGE_RULES.bannedControl.join("|")})\\b`, "i")
    const machine = new RegExp(LANGUAGE_RULES.bannedMachineTells.join("|"), "i")
    // The quotes themselves are exempt — they are other people talking, and
    // editing them would defeat the point of the file.
    expect(control.test(SURVIVORSHIP)).toBe(false)
    expect(machine.test(SURVIVORSHIP)).toBe(false)
  })
})

describe("filtering", () => {
  it("never leaks a vice-specific account to a different vice", () => {
    for (const vice of ["gambling", "porn", "weed", "nicotine", "alcohol"]) {
      for (const stage of ["urge", "lapse", "early", "goodStretch", "deciding", "long"] as const) {
        for (const t of testimonialsFor(stage, vice)) {
          // Either it is universal, or it belongs to this vice. Never another's.
          if (t.vices.length > 0) expect(t.vices, `${t.id} shown for ${vice}`).toContain(vice)
        }
      }
    }
  })

  it("has real coverage per vice rather than a token entry", () => {
    for (const vice of ["alcohol", "weed", "porn", "nicotine", "gambling"]) {
      const all = TESTIMONIALS.filter((t) => t.vices.length === 0 || t.vices.includes(vice))
      expect(all.length, vice).toBeGreaterThan(20)
    }
  })
})

/**
 * Quotes must actually be about the vice they are filed under.
 *
 * This exists because of a specific failure. Eighteen accounts were harvested
 * for "getting ready to quit weed", selected by whitelisting handles off
 * 190-character previews, and shipped without anyone reading them in full.
 * Four were about something else entirely — quitting drinking, hanging out
 * with random people, turning to food — and two more were mis-staged. Nearly
 * forty percent of what went out was wrong, and every existing test passed,
 * because nothing checked whether a quote was on its own topic.
 *
 * Automated topicality is imperfect, so this is deliberately a floor: it
 * catches the class of error that actually happened — a quote filed under one
 * vice while talking exclusively about another.
 */

/**
 * Distinctive terms only.
 *
 * The first version of this used loose stems and produced mostly noise:
 * `bet\w*` matched "better", "drink" matched "I don't drink caffeine", and
 * "sober" and "relapse" were treated as alcohol- and porn-specific when both
 * are used by everyone. Anything ambiguous is left out — "smoking" in
 * particular belongs to weed and nicotine equally.
 */
const DISTINCTIVE: Record<string, RegExp> = {
  weed: /\b(weed|cannabis|thc|joint|bong|stoned|t-?break|tolerance break)\b/i,
  alcohol: /\b(alcohol|booze|beer|wine|pint|drunk|hangover|drinking)\b/i,
  nicotine: /\b(cigarettes?|vap(?:e|ing)|nicotine|tobacco)\b/i,
  gambling: /\b(gambling|casino|slot machine|betting|wager|bookie)\b/i,
  porn: /\b(porn|pmo|nofap|masturbat\w*)\b/i,
}

describe("every quote is about the vice it is filed under", () => {
  it("does not file a quote under one vice while naming only another", () => {
    // Deliberately narrow: it only fires when a quote names a *different*
    // vice distinctively and never names its own. Many legitimate accounts
    // describe the experience — cravings, sleep, withdrawal — without naming
    // the substance at all, and those are not errors.
    // A source can settle it on its own: r/leaves and r/Petioles are cannabis
    // subreddits whatever a given post happens to mention. A weed quitter
    // describing how they started drinking instead is correctly filed under
    // weed — substitution to another substance is a documented pattern, not a
    // filing error.
    const SOURCE_SETTLES: Record<string, RegExp> = {
      weed: /r\/leaves|r\/Petioles/i,
      alcohol: /r\/stopdrinking|r\/dryalcoholics/i,
      nicotine: /r\/stopsmoking|r\/QuitVaping/i,
      gambling: /r\/problemgambling/i,
      porn: /r\/pornfree|r\/NoFap|pmohackbook/i,
    }

    const wrong: string[] = []
    for (const t of TESTIMONIALS) {
      if (t.vices.length !== 1) continue
      const vice = t.vices[0]
      const settles = SOURCE_SETTLES[vice]
      if (settles && (settles.test(t.source) || settles.test(t.url))) continue
      const own = DISTINCTIVE[vice]
      if (!own || own.test(t.quote)) continue
      for (const [other, re] of Object.entries(DISTINCTIVE)) {
        if (other === vice) continue
        if (re.test(t.quote)) {
          wrong.push(`${t.id} filed as ${vice} but names ${other}: ${t.quote.slice(0, 80)}`)
          break
        }
      }
    }
    expect(wrong, `mis-filed quotes:\n  ${wrong.join("\n  ")}`).toEqual([])
  })

  it("is somebody talking, not a researcher writing about them", () => {
    // Fifteen entries turned out to be two separate quotes glued together with
    // an ellipsis, and three were the research agent's own third-person
    // write-up presented as testimony. Both read as real and neither is.
    const COMPOSITE = /"\s*(?:…|\[\.…\]|\.\.\.)\s*"/
    const THIRD = /\b(he|she|they)\s+(?:was|were|had|went|said|played|decided|stopped)\b/i
    const FIRST = /\b(I|I'm|I've|my|me)\b/
    for (const t of TESTIMONIALS) {
      expect(t.quote, `${t.id} is two quotes glued together`).not.toMatch(COMPOSITE)
      if (THIRD.test(t.quote)) {
        expect(FIRST.test(t.quote.split(".")[0]), `${t.id} reads as a third-person summary`).toBe(true)
      }
    }
  })

  it("carries no scraped artefacts — greetings, escapes or truncation", () => {
    for (const t of TESTIMONIALS) {
      expect(t.quote, `${t.id} opens with a forum greeting`).not.toMatch(
        /^(hello|hi|hey)\s+(leaves|r\/|everyone|all|guys|folks)\b/i,
      )
      expect(t.quote, `${t.id} contains a markdown escape`).not.toMatch(/\\[~*_]/)
      // Four quotes named a different person inside the text than the handle
      // field credited, because the extractor swallowed the next line's byline.
      // A quote attributed to the wrong person is worse than no quote.
      const named = t.quote.match(/—\s*(u\/[A-Za-z0-9_-]+)/)
      expect(named, `${t.id} carries an attribution inside the quote text`).toBeNull()
      // Two timestamps from one video, or three reviewers, joined into one blob.
      expect(t.quote, `${t.id} joins two spans into one quote`).not.toMatch(
        /"\s*(?:—\s*\[\d+:\d+\]|\(\d+ stars?\)|(?:un)?verified reviewer)/,
      )
    }
  })
})
