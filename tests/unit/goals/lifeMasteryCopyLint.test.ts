import { describe, it, expect } from "vitest"
import { LIFE_MASTERY_AREAS } from "@/src/goals/data/lifeMasteryAreas"
import { HORIZON_SCREEN, VISION_RUNGS } from "@/src/goals/data/lifeMasteryWhy"

/**
 * Copy lint for the strings the LIVE Life Mastery page shows.
 *
 * It catches the "sentences don't fill out right" class the user spotted in
 * the mastery card: fragment chains rendered as prose, unfinished sentences,
 * leftovers from speech-to-text, unbalanced quotes. On top of that it applies
 * the voice rules, because the copy had drifted into a register nobody speaks
 * in: 187 of 418 strings carried an em-dash and 25 used the "X, not Y"
 * antithesis.
 *
 * SCOPE: the data the live page renders, read as data. The twelve areas
 * (`AreaDialog`, the wheel), the vision ladder (`StarTab`) and the horizon
 * choice (`StarTab`, `RecapTab`). The lab pages under `/test/*` are out of
 * scope. Their copy still exists, but nobody outside a lab sees it, and the
 * owner retired their tests. This file used to scan the lab component's source
 * with regexes; reading the exported objects instead means a renamed field
 * cannot slip past it.
 */

type Kind = "prose" | "label" | "quote"
interface LiveString { where: string; kind: Kind; text: string }
interface Violation { where: string; rule: string; text: string }

/** Every user-facing string in the live data, tagged with how it is shown. */
function liveStrings(): LiveString[] {
  const out: LiveString[] = []
  const add = (where: string, kind: Kind, text: string | undefined) => {
    if (text !== undefined) out.push({ where, kind, text })
  }

  for (const a of LIFE_MASTERY_AREAS) {
    add(`AREA.${a.id}.label`, "label", a.label)
    add(`AREA.${a.id}.sublabel`, "label", a.sublabel)
    add(`AREA.${a.id}.prompt`, "prose", a.prompt)
  }

  for (const r of VISION_RUNGS) {
    add(`VISION_RUNGS.${r.id}.question`, "prose", r.question)
    add(`VISION_RUNGS.${r.id}.help`, "prose", r.help)
    add(`VISION_RUNGS.${r.id}.lead`, "label", r.lead)
    add(`VISION_RUNGS.${r.id}.placeholder`, "label", r.placeholder)
    add(`VISION_RUNGS.${r.id}.example`, "prose", r.example)
    add(`VISION_RUNGS.${r.id}.quote`, "quote", r.quote)
  }

  add("HORIZON_SCREEN.question", "prose", HORIZON_SCREEN.question)
  add("HORIZON_SCREEN.help", "prose", HORIZON_SCREEN.help)
  add("HORIZON_SCREEN.note", "prose", HORIZON_SCREEN.note)
  add("HORIZON_SCREEN.start", "label", HORIZON_SCREEN.start)
  add("HORIZON_SCREEN.quote", "quote", HORIZON_SCREEN.quote)
  for (const o of HORIZON_SCREEN.options) {
    add(`HORIZON_SCREEN.options.${o.years}.label`, "label", o.label)
    add(`HORIZON_SCREEN.options.${o.years}.note`, "prose", o.note)
  }

  return out
}

/**
 * Faults that are in live copy today and that this lint would otherwise fail on.
 * Each one is a real defect, not an exemption: the fix is to the copy in
 * `src/`. The list may only shrink, and a fixed entry must be removed from it,
 * which the last assertion below enforces.
 */
const KNOWN_LIVE_FAULTS: ReadonlyArray<{ where: string; rule: string }> = [
  // "His usual answer." — the tooltip on the 10-year button on the Star tab
  // talks about the source coach in the third person. Found 2026-10-13, when
  // this lint was first pointed at the live strings instead of the lab's.
  { where: "HORIZON_SCREEN.options.10.note", rule: "guru pronoun" },
]

const isKnown = (v: Violation) => KNOWN_LIVE_FAULTS.some((k) => k.where === v.where && v.rule.startsWith(k.rule))

/** Artefacts that mean the string is broken, whatever voice it is in. */
function artefacts(s: LiveString): Violation[] {
  const v: Violation[] = []
  const t = s.text.trim()
  const push = (rule: string, text = t.slice(0, 80)) => v.push({ where: s.where, rule, text })
  if (!t) return [{ where: s.where, rule: "empty", text: "" }]
  if (t.includes("  ")) push("double-space")
  if (((t.match(/"/g) ?? []).length % 2) !== 0) push("unbalanced quotes")
  if (/&(ldquo|rdquo|apos|amp);/.test(t)) push("html entity in data")
  // A quote is verbatim speech, and the transcripts carry no punctuation of
  // their own, so only our own prose is held to sentence shape.
  if (s.kind === "prose") {
    if ((t.match(/ · /g) ?? []).length > 3) push("fragment-chain (>3 '·')")
    if (t.length > 60 && !/[.!?…"”'’)\]]$/.test(t)) push("no terminal punctuation", t.slice(-60))
  }
  // Voice policy v2: OUR program, never third person about the source coach.
  // A quote is his words and may say "he".
  if (s.kind !== "quote") {
    if (/\b(Stefan|Tatiana)\b/.test(t)) push("guru name (voice policy v2)")
    if (/\b([Hh]e|[Hh]is|[Hh]im)\b(?![a-z])/.test(t)) push("guru pronoun (voice policy v2)")
  }
  return v
}

/**
 * The mechanical tells that made the copy read as machine-written. Taste cannot
 * be linted, but these three can. Verbatim quotes are exempt from the
 * antithesis rules, because the source does sometimes speak in contrasts; the
 * em-dash rule applies to them too, since punctuation inside a quote is ours.
 */
const VOICE_RULES: Array<{ rule: string; test: RegExp; quotesExempt?: boolean; fix: string }> = [
  { rule: "em-dash", test: /—/, fix: "Use a period, or \"and\", or a comma." },
  { rule: "antithesis \"X, not Y\"", test: /,\s+not\s+[a-z]/, quotesExempt: true, fix: "Say the thing you mean and stop." },
  { rule: "antithesis \"isn't X, it's Y\"", test: /\b(isn'?t|aren'?t|is not)\b[^.!?]{2,50}\bit'?s\b/i, quotesExempt: true, fix: "State the positive claim on its own." },
  { rule: "\"not just\"", test: /\bnot just\b/i, quotesExempt: true, fix: "Drop the comparison and say what it is." },
]

function voice(s: LiveString): Violation[] {
  const t = s.text.trim()
  return VOICE_RULES
    .filter((r) => !(r.quotesExempt && s.kind === "quote"))
    .filter((r) => r.test.test(t))
    .map((r) => ({ where: s.where, rule: `voice: ${r.rule} (${r.fix})`, text: t.slice(0, 100) }))
}

describe("Life Mastery copy lint — live prose must read like writing", () => {
  it("finds zero violations across the strings the live page shows", () => {
    const strings = liveStrings()
    // Premise: twelve areas, seven rungs and the horizon screen. A lint over an
    // empty list passes while checking nothing.
    expect(strings.length, "premise: the lint is reading the live data").toBeGreaterThan(60)

    const found = strings.flatMap(artefacts).filter((v) => !isKnown(v))
    expect(found, found.map((v) => `${v.where} [${v.rule}]: ${v.text}`).join("\n")).toEqual([])
  })

  it("live copy follows the voice rules", () => {
    const found = liveStrings().flatMap(voice).filter((v) => !isKnown(v))
    expect(
      found,
      `Voice rules (docs/plans/life-mastery-intake-redesign.md):\n` +
      `Say "you". One idea per sentence. No em-dashes. No "X, not Y".\n\n` +
      found.map((v) => `${v.where} [${v.rule}]\n    ${v.text}`).join("\n"),
    ).toEqual([])
  })

  it("lists no known fault that has since been fixed", () => {
    const all = liveStrings().flatMap((s) => [...artefacts(s), ...voice(s)])
    const fixed = KNOWN_LIVE_FAULTS.filter((k) => !all.some((v) => v.where === k.where && v.rule.startsWith(k.rule)))
    expect(fixed, "fixed in src/, so remove from KNOWN_LIVE_FAULTS").toEqual([])
  })
})
