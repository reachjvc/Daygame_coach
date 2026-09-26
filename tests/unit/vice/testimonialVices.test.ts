import { describe, it, expect } from "vitest"
import { TESTIMONIALS, testimonialsFor } from "@/src/vice/data/testimonials"
import { VICES } from "@/src/vice/data/vices"

/**
 * A QUOTE THAT NAMES ONE THING MUST NOT BE SHOWN TO SOMEBODY QUITTING ANOTHER.
 *
 * `Testimonial.vices` is documented as "Empty means it applies to any", and
 * `testimonialsFor` implements exactly that: `t.vices.length === 0 ||
 * viceId === null || t.vices.includes(viceId)`. So an untagged entry is served
 * for every vice in the product.
 *
 * On 2026-09-25, 71 of 376 entries were untagged, and they were not universal —
 * they were unlabelled. Driving the urge door as somebody quitting DRINKING
 * served `06-152`, from r/OpiatesRecovery, under the heading "Somebody else, in
 * the same spot". Fourteen untagged entries were reachable from the live page,
 * one of them in the thought door at stage `goodStretch`, where it sat directly
 * under the person's own record and talked about thirty drinks a week.
 *
 * This is the 2026-08-20 corpus finding for the third time. Then it was "vice
 * assigned by source FILE, not per entry" — file 13 covers six substances, file
 * 14 covers alcohol and cannabis — and 23 entries were re-filed. The entries
 * were fixed and **the rule that turns "nobody tagged this" into "show it to
 * everybody" was left in place**, so the next import repeated it.
 *
 * ----------------------------------------------------------------------------
 * WHY THIS FLAGS RATHER THAN TAGS.
 *
 * It would be one afternoon's work to assign a vice from these keywords
 * automatically, and it would be the same mistake a third time. The repo's own
 * rule for bulk data says never filter on a field that is not the content, and
 * never infer a mapping from one example — and a keyword IS a crude read of the
 * content. Two entries in this corpus come from ONE YouTube video
 * (`pGoeG5aY3S0`) and are about different things: one says "free from
 * cigarettes", the next says "my relationship with weed". A per-video or
 * per-keyword rule gets one of them wrong.
 *
 * So the terms below are a TRIPWIRE, not a classifier. They say "a person read
 * this quote and it names something specific; a person must decide what". The
 * failure message names every entry so that decision is cheap.
 */

/**
 * Words that place a quote with one vice rather than any.
 *
 * Deliberately the unambiguous ones. "Clean", "sober", "withdrawal", "relapse"
 * and "my recovery" are NOT here and must not be added: they are the shared
 * vocabulary of every account in the corpus, and a quote that uses only those
 * genuinely does apply to anyone — which is what `vices: []` is for.
 */
const NAMES_A_VICE = [
  // alcohol
  /\balcohol\b/i, /\bdrink(s|ing)?\b/i, /\bbeer\b/i, /\bwine\b/i, /\bliquor\b/i,
  /\bbooze\b/i, /\bpint\b/i, /\bAlcoholics Anonymous\b/i,
  // nicotine
  /\bcigarette/i, /\bsmoking\b/i, /\bsmoker\b/i, /\bsmoke(d)?\b/i, /\bvap(e|ing)\b/i,
  /\bnicotine\b/i, /\btobacco\b/i,
  // weed
  /\bweed\b/i, /\bcannabis\b/i, /\bmarijuana\b/i,
  // porn
  /\bporn\b/i, /\bsexual\b/i, /\bmasturbat/i,
  // gambling
  /\bgambl(e|ing)\b/i, /\bcasino\b/i, /\bbetting\b/i,
  // opioids and stimulants — in the corpus, not in the product. See below.
  /\bopioid\b/i, /\bopiate/i, /\bmethadone\b/i, /\bsuboxone\b/i, /\bheroin\b/i,
  /\boxy\b/i, /\bfentanyl\b/i, /\bVivitrol\b/i, /\bsubs\b/i,
]

/**
 * Vice tags that are real, plus the ones the CORPUS covers and the product does
 * not.
 *
 * `opiates` is the whole point of this list. The nine things a person can quit
 * here are alcohol, nicotine, weed, scrolling, gaming, porn, gambling, junk and
 * spending — there is no opioid option, and source file 06 is accounts of
 * coming off them. Nine of its untagged entries name methadone, Suboxone,
 * Vivitrol, an opioid blocker or a dealer, and carry this tag now; the other
 * seven name nothing specific — "the only person who knows is my husband" — and
 * stay universal, because judging those by their source file is the very error
 * this corpus was corrected for in August. Those accounts are real research and
 * must stay in the data; `opiates` means `testimonialsFor` serves them to
 * nobody, which is correct, and they are already written and tagged the day an
 * opioid vice is ever added.
 *
 * An unknown tag is a typo that silently hides a quote, which is why this is a
 * closed list rather than a free string.
 */
const PRODUCT_VICES = VICES.map((v) => v.id)
const CORPUS_ONLY_VICES = ["opiates"]
const KNOWN_VICES = [...PRODUCT_VICES, ...CORPUS_ONLY_VICES]

describe("no testimonial is shown to somebody quitting a different thing", () => {
  it("every vice tag is one this codebase knows", () => {
    const unknown = TESTIMONIALS.flatMap((t) =>
      t.vices.filter((v) => !KNOWN_VICES.includes(v)).map((v) => `${t.id} -> "${v}"`),
    )
    expect(
      unknown,
      `Unknown vice tags. A typo here does not fail anything on screen — it just\n` +
        `stops the quote matching any vice, silently:\n  ${unknown.join("\n  ")}`,
    ).toEqual([])
  })

  it("a quote that names a specific thing is not left applying to every vice", () => {
    const mislabelled = TESTIMONIALS.filter(
      (t) => t.vices.length === 0 && NAMES_A_VICE.some((re) => re.test(t.quote)),
    ).map((t) => {
      const hit = NAMES_A_VICE.find((re) => re.test(t.quote))
      return `${t.id} says "${t.quote.match(hit!)?.[0]}" — ${t.source}`
    })

    expect(
      mislabelled,
      `These are untagged, so testimonialsFor serves them for EVERY vice, and\n` +
        `each one names something specific. Read the quote and tag it; do not\n` +
        `widen the term list to make this pass:\n  ${mislabelled.join("\n  ")}`,
    ).toEqual([])
  })

  it("and the tripwire is not so broad that a genuinely universal quote trips it", () => {
    // WITHOUT THIS, the previous case can be satisfied by tagging everything,
    // which would empty the universal pool and leave the doors with nothing to
    // show for a vice with few accounts. The shared vocabulary of recovery must
    // stay taggable as "anyone".
    for (const generic of [
      "The final night was no bigger or smaller than any other night.",
      "What if I relapse? Then you start again. No drama, no shame spiral.",
      "you will feel worse before you feel better",
      "I was clean and I didnae realise how clean I was",
    ]) {
      expect(
        NAMES_A_VICE.some((re) => re.test(generic)),
        `"${generic}" is the shared vocabulary of every account here and must ` +
          `stay eligible to apply to anyone`,
      ).toBe(false)
    }

    // And there must still BE a universal pool, or the rule above has eaten it.
    const universal = TESTIMONIALS.filter((t) => t.vices.length === 0)
    expect(universal.length, "no universal accounts left at all").toBeGreaterThan(5)
  })

  it("the corpus-only tags reach nobody, which is the point of tagging them", () => {
    // Nine opioid accounts were being served to everybody, this one included:
    // "he started me on methadone... So he put me on Suboxone", shown to
    // somebody quitting scrolling. This asserts the fix does what it claims
    // rather than trusting the filter.
    for (const viceId of PRODUCT_VICES) {
      const served = testimonialsFor("urge", viceId)
      const wrong = served.filter((t) => t.vices.some((v) => CORPUS_ONLY_VICES.includes(v)))
      expect(
        wrong.map((t) => t.id),
        `someone quitting "${viceId}" is being shown a corpus-only account`,
      ).toEqual([])
    }
  })

  /**
   * WHAT THE CORPUS DOES NOT COVER, WRITTEN DOWN RATHER THAN DISCOVERED AGAIN.
   *
   * Tagging by content exposed a gap that the untagged pool had been hiding:
   * **the 15-source corpus has no accounts at all for scrolling, gaming, junk
   * or spending**, and none at the good stretch for porn or gambling either. It
   * is fifteen sources about drinking, weed, nicotine, opioids, gambling and
   * compulsive sexual behaviour, and the product offers nine things to quit.
   *
   * Before the tagging, those six vices were served the ONE untagged
   * `goodStretch` entry, every time, for every report count — and that entry is
   * about thirty drinks a week. Driven on 2026-09-25: somebody quitting
   * SCROLLING, reading their own record in the thought door, was shown it under
   * the heading "Somebody else, at the same point".
   *
   * So the door now shows nothing there, and that is the better of two honest
   * outcomes. `OneVoice` returns null on an empty pool and the section is simply
   * absent — verified in a browser, no error, no empty frame. A module whose
   * claim is that it read two thousand real accounts cannot answer a scroller
   * with a drinker's number and keep the claim.
   *
   * THE LIST IS A DEBT, NOT A DESIGN. It shrinks when somebody does the research
   * for those vices, and the second case below is what forces it to: a vice
   * listed here that HAS gained accounts fails, so the list cannot rot into a
   * permanent excuse the way an unchecked allowlist does.
   */
  const NO_GOOD_STRETCH_ACCOUNTS = [
    "scrolling",
    "gaming",
    "porn",
    "gambling",
    "junk",
    "spending",
    "custom",
  ]

  it("every vice the corpus DOES cover still has an account at the good stretch", () => {
    const covered = PRODUCT_VICES.filter((v) => !NO_GOOD_STRETCH_ACCOUNTS.includes(v))
    // Named, so that "covered" shrinking to nothing cannot pass this quietly.
    expect(covered.sort()).toEqual(["alcohol", "nicotine", "weed"])
    for (const viceId of covered) {
      expect(
        testimonialsFor("goodStretch", viceId).length,
        `"${viceId}" had accounts at the good stretch and now has none`,
      ).toBeGreaterThan(0)
    }
  })

  it("and a vice on the uncovered list that has gained accounts must come off it", () => {
    // The companion assertion this repo requires of every allowlist: an entry
    // whose reason has gone is a free pass waiting for the fault to return.
    const stale = NO_GOOD_STRETCH_ACCOUNTS.filter(
      (v) => v !== "custom" && testimonialsFor("goodStretch", v).length > 0,
    )
    expect(
      stale,
      `These now have accounts at the good stretch — delete them from
` +
        `NO_GOOD_STRETCH_ACCOUNTS: ${stale.join(", ")}`,
    ).toEqual([])
  })

  it("nobody is left with nothing at the urge, which is the door that must always answer", () => {
    // The urge door is the one opened mid-craving, and unlike the good stretch
    // it is still covered for every vice — by the universal pool, which is why
    // that pool must not be tagged away to nothing.
    for (const viceId of PRODUCT_VICES.filter((v) => v !== "custom")) {
      expect(
        testimonialsFor("urge", viceId).length,
        `nothing to show somebody quitting "${viceId}" mid-urge`,
      ).toBeGreaterThan(0)
    }
    // Four of the nine have no accounts of their own at all and are served
    // entirely from the universal pool. Stated as a number so that pool
    // shrinking is a failure rather than a surprise.
    expect(
      testimonialsFor("urge", "scrolling").length,
      "the universal pool at the urge has shrunk; scrolling, gaming, junk and " +
        "spending have no accounts of their own and it is all they get",
    ).toBeGreaterThanOrEqual(3)
  })
})
