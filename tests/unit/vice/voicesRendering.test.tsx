import { describe, it, expect, afterEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { OneVoice } from "@/src/vice/components/Voices"
import { TESTIMONIALS, testimonialsFor } from "@/src/vice/data/testimonials"

/**
 * A QUOTE MUST NOT SHOW ITS OWN MARKUP TO THE PERSON READING IT.
 *
 * `testimonials.ts` marks the key phrase of a long account with `**`, so a
 * three-sentence quote has a readable centre. That convention was never
 * rendered: `OneVoice` interpolated the raw string, so twenty-three entries
 * printed literal asterisks, and **twenty-two of them sit at `urge` or
 * `goodStretch`** — the only two stages the live page reads. The sentence a
 * person met at the moment they were deciding whether they could moderate had
 * `**` in the middle of it.
 *
 * It had been that way since the component was written, through every pass over
 * this module, and no test saw it because the data tests assert on the STRING
 * and the string is correct. Only rendering it shows the fault, which is why
 * this file renders rather than greps.
 *
 * Found by driving the thought door for four vices and reading what came out.
 */

afterEach(cleanup)

describe("a quote renders as a quote, not as markup", () => {
  it("shows no literal asterisks for any account the live page can reach", () => {
    // Both live stages, every vice, every rotation — because the fault was in a
    // subset of entries and a single render would have missed it.
    const vices = [null, "alcohol", "nicotine", "weed", "scrolling", "gaming", "porn", "gambling", "junk", "spending"]
    let rendered = 0
    for (const stage of ["urge", "goodStretch"] as const) {
      for (const viceId of vices) {
        const pool = testimonialsFor(stage, viceId)
        for (let rotate = 0; rotate < pool.length; rotate++) {
          cleanup()
          render(<OneVoice stage={stage} viceId={viceId} rotate={rotate} />)
          // BY THE PARAGRAPH, NOT BY ITS TEXT. `Quoted` deliberately splits the
          // quote across a <b> and several <span>s, so a text matcher cannot
          // see it whole — the first version of this test failed for that
          // reason, which is itself evidence the split is happening.
          const quote = [...document.querySelectorAll("p")].find((el) =>
            (el.textContent ?? "").includes("\u201c"),
          )
          expect(quote, "no quote paragraph rendered").toBeDefined()
          expect(
            quote!.textContent,
            `a quote shown for ${viceId ?? "no vice"} at ${stage} still has ** in it`,
          ).not.toContain("**")
          rendered++
        }
      }
    }
    // A loop over an empty pool passes by asking nothing, which is the shape of
    // half the faults this module has had.
    expect(rendered, "no quotes were rendered at all").toBeGreaterThan(50)
  })

  it("keeps the emphasised words, rather than dropping them with the asterisks", () => {
    // The cheap wrong fix is to strip `**` from the string, which loses nothing
    // visible in a test that only looks for asterisks. So: the words inside the
    // emphasis must still be on screen, and they must be in a <b>.
    const marked = TESTIMONIALS.find(
      (t) => t.quote.includes("**") && (t.stages.includes("urge") || t.stages.includes("goodStretch")),
    )
    expect(marked, "no live entry uses the ** convention any more — is it still a convention?").toBeDefined()

    const inner = marked!.quote.split("**")[1]
    expect(inner, "the ** pair is unbalanced in the fixture entry").toBeTruthy()

    const stage = marked!.stages.includes("goodStretch") ? "goodStretch" : "urge"
    const pool = testimonialsFor(stage, marked!.vices[0] ?? null)
    const at = pool.findIndex((t) => t.id === marked!.id)
    render(<OneVoice stage={stage} viceId={marked!.vices[0] ?? null} rotate={at} />)

    const bold = document.querySelector("b")
    expect(bold, "the emphasised span is not rendered as emphasis").not.toBeNull()
    expect(bold!.textContent).toBe(inner)
  })

  it("leaves a marked elision visible, because it is part of the quotation", () => {
    // `[…]` says words were removed. Hiding it would turn a trimmed quote into
        // one that reads as continuous, which is a different claim about what
    // somebody said.
    const elided = TESTIMONIALS.filter((t) => t.quote.includes("[…]"))
    if (elided.length === 0) return
    const t = elided[0]
    const stage = t.stages[0]
    const pool = testimonialsFor(stage, t.vices[0] ?? null)
    const at = pool.findIndex((x) => x.id === t.id)
    if (at < 0) return
    render(<OneVoice stage={stage} viceId={t.vices[0] ?? null} rotate={at} />)
    const shown = [...document.querySelectorAll("p")].find((el) =>
      (el.textContent ?? "").includes("[…]"),
    )
    expect(shown, "the marked elision is not on screen").toBeDefined()
  })
})
