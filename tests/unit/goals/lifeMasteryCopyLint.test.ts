import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { PRINCIPLES, SOS_PROTOCOLS, INCANTATION_CARDS } from "@/src/goals/data/lifeMasteryPrinciples"
import {
  MANIFESTO_PROGRAM_CREDO, INCANTATION_DECK, INCANTATION_PROTOCOL, MONEY_JARS,
  MONEY_WEEKLY_RITUAL, MONEY_RULES, MONEY_DEBT_PROTOCOL, RELATIONSHIP_JOURNAL_SCRIPT,
  RULES_EXERCISE, CONSEQUENCE_MENU, CONSEQUENCE_RULES, MASTERY_TEN_KEYS,
  MASTERY_THREE_LEVELS, PLATEAU_DOCTRINE, RESOURCE_LADDER, AREA_BOOKS,
} from "@/src/goals/data/lifeMasteryContent"
import { LIFE_MASTERY_AREAS } from "@/src/goals/data/lifeMasteryAreas"

/**
 * Copy lint — catches the "sentences don't fill out right" class the user
 * spotted in the mastery card: fragment chains rendered as prose, unfinished
 * sentences, ASR leftovers, unbalanced quotes. Every USER-FACING prose string
 * in the Life Mastery data layer must read like writing, not data.
 */

interface Violation { where: string; rule: string; text: string }
const violations: Violation[] = []

function lintProse(where: string, text: string) {
  const t = text.trim()
  if (!t) return
  if (t.includes("  ")) violations.push({ where, rule: "double-space", text: t.slice(0, 80) })
  // fragment chains: interpunct/pipe-separated lists crammed into prose
  if ((t.match(/ · /g) ?? []).length > 3) violations.push({ where, rule: "fragment-chain (>3 '·')", text: t.slice(0, 80) })
  // prose-length strings must end like sentences
  if (t.length > 60 && !/[.!?…\"”'’)\]]$/.test(t)) violations.push({ where, rule: "no terminal punctuation", text: t.slice(-60) })
  // unbalanced straight double-quotes
  if (((t.match(/"/g) ?? []).length % 2) !== 0) violations.push({ where, rule: "unbalanced quotes", text: t.slice(0, 80) })
  // HTML entities leaking into plain-data strings
  if (/&(ldquo|rdquo|apos|amp);/.test(t)) violations.push({ where, rule: "html entity in data", text: t.slice(0, 80) })
  lintVoice(where, t)
}

// Voice policy v2: OUR program — no unnamed-guru references in user-facing copy.
function lintVoice(where: string, t: string) {
  if (/\b(Stefan|Tatiana)\b/.test(t)) violations.push({ where, rule: "guru name (voice policy v2)", text: t.slice(0, 80) })
  if (/\b([Hh]e|[Hh]is|[Hh]im)\b(?![a-z])/.test(t)) violations.push({ where, rule: "guru pronoun (voice policy v2)", text: t.slice(0, 80) })
}

// Short labels/titles are exempt from sentence rules but not from artifacts.
function lintLabel(where: string, text: string) {
  const t = text.trim()
  if (t.includes("  ")) violations.push({ where, rule: "double-space", text: t.slice(0, 80) })
  if (/&(ldquo|rdquo|apos|amp);/.test(t)) violations.push({ where, rule: "html entity in data", text: t.slice(0, 80) })
  lintVoice(where, t)
}

describe("Life Mastery copy lint — prose must read like writing", () => {
  it("finds zero violations across all user-facing data strings", () => {
    for (const card of Object.values(PRINCIPLES)) {
      lintLabel(`PRINCIPLES.${card.id}.title`, card.title)
      lintProse(`PRINCIPLES.${card.id}.teaser`, card.teaser)
      lintProse(`PRINCIPLES.${card.id}.principle`, card.principle)
      lintProse(`PRINCIPLES.${card.id}.mechanism`, card.mechanism)
      lintProse(`PRINCIPLES.${card.id}.practice`, card.practice)
      lintProse(`PRINCIPLES.${card.id}.trap`, card.trap)
      card.quotes.forEach((q, i) => lintProse(`PRINCIPLES.${card.id}.quotes[${i}]`, q.replace(/\s*\([A-Za-z0-9_-]{11}\)\s*$/, "")))
    }
    for (const p of SOS_PROTOCOLS) {
      p.steps.forEach((st, i) => lintProse(`SOS.${p.id}.steps[${i}]`, st))
      lintProse(`SOS.${p.id}.closer`, p.closer)
    }
    INCANTATION_CARDS.forEach((c, i) => lintLabel(`INCANTATION_CARDS[${i}]`, c))
    MANIFESTO_PROGRAM_CREDO.forEach((l, i) => lintProse(`MANIFESTO_PROGRAM_CREDO[${i}]`, l.text))
    INCANTATION_DECK.forEach((c, i) => lintLabel(`INCANTATION_DECK[${i}]`, c.text))
    INCANTATION_PROTOCOL.forEach((l, i) => lintProse(`INCANTATION_PROTOCOL[${i}]`, l))
    MONEY_JARS.forEach((j) => lintProse(`MONEY_JARS.${j.name}`, j.blurb))
    MONEY_WEEKLY_RITUAL.steps.forEach((st, i) => lintProse(`MONEY_WEEKLY_RITUAL.steps[${i}]`, st))
    lintProse("MONEY_WEEKLY_RITUAL.why", MONEY_WEEKLY_RITUAL.why)
    MONEY_RULES.forEach((r, i) => lintProse(`MONEY_RULES[${i}]`, r.text))
    MONEY_DEBT_PROTOCOL.steps.forEach((st, i) => lintProse(`MONEY_DEBT_PROTOCOL.steps[${i}]`, st))
    lintProse("JOURNAL.container", RELATIONSHIP_JOURNAL_SCRIPT.container)
    lintProse("JOURNAL.cadence", RELATIONSHIP_JOURNAL_SCRIPT.cadence)
    RELATIONSHIP_JOURNAL_SCRIPT.steps.forEach((st, i) => {
      lintLabel(`JOURNAL.steps[${i}].title`, st.title)
      lintProse(`JOURNAL.steps[${i}].detail`, st.detail)
    })
    RULES_EXERCISE.diagnose.forEach((d, i) => lintProse(`RULES.diagnose[${i}]`, d))
    RULES_EXERCISE.rewriteExamples.forEach((e, i) => lintProse(`RULES.examples[${i}]`, e.text))
    lintProse("RULES.invertExample", RULES_EXERCISE.invertExample.text)
    lintProse("RULES.condition", RULES_EXERCISE.condition)
    CONSEQUENCE_MENU.forEach((c, i) => lintLabel(`CONSEQUENCE_MENU[${i}]`, c.text))
    CONSEQUENCE_RULES.forEach((r, i) => lintProse(`CONSEQUENCE_RULES[${i}]`, r))
    MASTERY_TEN_KEYS.forEach((k, i) => lintProse(`MASTERY_TEN_KEYS[${i}]`, k))
    lintProse("MASTERY_THREE_LEVELS", MASTERY_THREE_LEVELS)
    lintProse("PLATEAU_DOCTRINE", PLATEAU_DOCTRINE)
    RESOURCE_LADDER.forEach((r, i) => lintProse(`RESOURCE_LADDER[${i}]`, r))
    Object.entries(AREA_BOOKS).forEach(([k, books]) => books.forEach((b, i) => lintLabel(`AREA_BOOKS.${k}[${i}]`, b)))
    for (const a of LIFE_MASTERY_AREAS) {
      lintLabel(`AREA.${a.id}.label`, a.label)
      lintProse(`AREA.${a.id}.prompt`, a.prompt)
    }

    expect(violations, violations.map((v) => `${v.where} [${v.rule}]: ${v.text}`).join("\n")).toEqual([])
  })

  /**
   * v23 — the lint only ever saw the data files it imported, so three new data
   * files and the entire component were outside the net. That is exactly how a
   * whole mode shipped written in third person about the source coach while
   * this test stayed green. Lint the SOURCE of the surfaces that render.
   */
  it("no guru pronouns or names in the newer data layers", () => {
    const v: Violation[] = []
    const files = ["lifeMasteryExemplar.ts", "lifeMasterySingle.ts", "lifeMasteryBeliefs.ts"]
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), "src/goals/data", f), "utf8")
      for (const [i, line] of src.split("\n").entries()) {
        // skip comments — internal notes may name the source freely
        const code = line.trim()
        if (code.startsWith("//") || code.startsWith("*") || code.startsWith("/*")) continue
        // only user-facing prose fields, never `quote:` (verbatim source material
        // is allowed to be his words — it's quoted, attributed material)
        const m = code.match(/^(gloss|title|ask|why|action|point|note|caution|label|placeholder|wantPrompt|becomePrompt|question|strategic|lostIt|lostItAdvice):\s*"(.+)"/)
        if (!m) continue
        if (/\b(Stefan|Tatiana)\b/.test(m[2])) v.push({ where: `${f}:${i + 1}`, rule: "guru name", text: m[2].slice(0, 90) })
        if (/\b([Hh]e|[Hh]is|[Hh]im|[Hh]e's|[Hh]e'd)\b(?![a-z])/.test(m[2])) v.push({ where: `${f}:${i + 1}`, rule: "guru pronoun", text: m[2].slice(0, 90) })
      }
    }
    expect(v, v.map((x) => `${x.where} [${x.rule}]: ${x.text}`).join("\n")).toEqual([])
  })

  /**
   * v25 VOICE RULES. The copy had drifted into a register nobody speaks in:
   * 187 of 418 user-facing strings carried an em-dash and 25 used the "X, not Y"
   * antithesis. The source material sounds nothing like that. Across 42,000
   * sampled words it is second person, short plain clauses joined by "and" and
   * "so", and it never does antithesis.
   *
   * These checks are mechanical on purpose. Taste cannot be linted, but the
   * three tells that made the copy read as machine-written can be.
   *
   * Scope: our own prose. Verbatim `quote` material is exempt from the
   * antithesis rule, because the source does sometimes speak in contrasts.
   * Punctuation inside a quote is still ours (the transcripts have none), so
   * the em-dash rule applies everywhere.
   */
  /** Spoken lines: incantations, credo lines, affirmations. Contrast is a real
   * rhetorical device when a line is meant to be said out loud ("my past is
   * data, not destiny"), and it reads as an affirmation rather than as machine
   * prose. The em-dash rule still applies to them; the antithesis rules do not.
   * This is scoped by FIELD, so it cannot quietly cover explanatory copy. */
  const SPOKEN_FIELDS = /^(text|softener|template)$/

  const VOICE_RULES: Array<{ rule: string; test: RegExp; quotesExempt?: boolean; spokenExempt?: boolean; fix: string }> = [
    { rule: "em-dash", test: /—/, fix: "Use a period, or \"and\", or a comma." },
    { rule: "antithesis \"X, not Y\"", test: /,\s+not\s+[a-z]/, quotesExempt: true, spokenExempt: true, fix: "Say the thing you mean and stop." },
    { rule: "antithesis \"isn't X, it's Y\"", test: /\b(isn'?t|aren'?t|is not)\b[^.!?]{2,50}\bit'?s\b/i, quotesExempt: true, spokenExempt: true, fix: "State the positive claim on its own." },
    { rule: "\"not just\"", test: /\bnot just\b/i, quotesExempt: true, fix: "Drop the comparison and say what it is." },
  ]

  function lintVoiceRules(where: string, text: string, isQuote: boolean, out: Violation[], spoken = false) {
    const t = text.trim()
    if (!t || /^[\s·|—-]+$/.test(t)) return
    for (const r of VOICE_RULES) {
      if (r.quotesExempt && isQuote) continue
      if (r.spokenExempt && spoken) continue
      if (r.test.test(t)) out.push({ where, rule: `voice: ${r.rule} (${r.fix})`, text: t.slice(0, 100) })
    }
  }

  it("user-facing copy follows the voice rules", () => {
    const v: Violation[] = []
    const PROSE_FIELDS = /^(teaser|principle|mechanism|practice|trap|gloss|title|ask|why|action|point|note|caution|label|placeholder|blurb|prompt|eg|q|detail|closer|intro|question|sublabel|text|softener|template|wantPrompt|becomePrompt|strategic|lostIt|lostItAdvice)$/
    const QUOTE_FIELDS = /^(quote|quotes|purposeQuote)$/

    const dataFiles = ["lifeMasteryPrinciples.ts", "lifeMasteryContent.ts", "lifeMasteryAreas.ts",
                       "lifeMasteryExemplar.ts", "lifeMasterySingle.ts", "lifeMasteryBeliefs.ts",
                       "lifeMasteryIntake.ts", "lifeMasteryExample.ts"]
    const sources: Array<[string, string]> = dataFiles.map((f) => [f, join(process.cwd(), "src/goals/data", f)])
    // GUIDE_SESSIONS lives in the service, so the guide's copy was outside the
    // net entirely. That is how "Clear the year first… — and only then the
    // goals" survived a passing lint.
    sources.push(["visionPlanService.ts", join(process.cwd(), "src/goals/visionPlanService.ts")])
    // The morning-ritual and routine library renders straight into the intake's
    // last page and was never linted, so it still read in the old register.
    sources.push(["visionRoutineLibrary.ts", join(process.cwd(), "src/goals/data/visionRoutineLibrary.ts")])

    for (const [name, path] of sources) {
      const src = readFileSync(path, "utf8")
      for (const [i, line] of src.split("\n").entries()) {
        const code = line.trim()
        if (code.startsWith("//") || code.startsWith("*") || code.startsWith("/*")) continue
        // Match a prose field ANYWHERE on the line. Anchoring to line start
        // missed every inline object literal, e.g.
        //   { id: "rit-move", title: "Move — stretch, walk", minutes: 10 }
        // which is how the whole ritual library stayed unlinted.
        for (const m of code.matchAll(/(\w+):\s*"([^"\\]{8,})"/g)) {
          const isQuote = QUOTE_FIELDS.test(m[1])
          if (!PROSE_FIELDS.test(m[1]) && !isQuote) continue
          lintVoiceRules(`${name}:${i + 1}`, m[2], isQuote, v, SPOKEN_FIELDS.test(m[1]))
        }
      }
    }

    /**
     * JSX text wraps across source lines, so a line-based scan silently misses
     * any sentence long enough to need wrapping. Those are exactly the
     * sentences worth linting. Strip comments, then match text spans against
     * the WHOLE file: `[^<>{}]` cannot cross a tag boundary, so a span is still
     * one text node.
     */
    const labPath = join(process.cwd(), "src/goals/components/vision-plan/VisionPlanLab.tsx")
    const lab = readFileSync(labPath, "utf8")
    const lineOf = (idx: number) => lab.slice(0, idx).split("\n").length
    const stripped = lab
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
      .replace(/^\s*\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "))
    for (const m of stripped.matchAll(/>([^<>{}]{12,})</g)) {
      const text = m[1].replace(/\s+/g, " ").trim()
      lintVoiceRules(`VisionPlanLab.tsx:${lineOf(m.index!)}`, text, false, v)
    }
    for (const m of stripped.matchAll(/\b(?:title|placeholder|aria-label)="([^"]{12,})"/g)) {
      lintVoiceRules(`VisionPlanLab.tsx:${lineOf(m.index!)}`, m[1], false, v)
    }

    /**
     * Copy also hides in string literals inside JSX expressions, e.g. the two
     * branches of a ternary. Those are neither text nodes nor attributes, so
     * both scans above walk straight past them.
     *
     * `looksLikeProse` keeps className strings and other technical literals out:
     * real copy has several plain words and no Tailwind tokens.
     */
    const TAILWIND = /(^|\s)(text|bg|border|rounded|flex|grid|px|py|pt|pb|pl|pr|mt|mb|ml|mr|mx|my|gap|w|h|min|max|top|left|right|bottom|z|opacity|hover|focus|group|sm|md|lg|xl|space|items|justify|self|col|row|tracking|leading|font|shadow|ring|backdrop|transition|duration|animate|overflow|absolute|relative|sticky|fixed|inline|block|hidden)-/
    const looksLikeProse = (t: string) => {
      if (t.length < 20 || !t.includes(" ")) return false
      if (TAILWIND.test(t) || t.includes("://") || t.startsWith("@/")) return false
      const words = t.split(/\s+/).filter((w) => /^[A-Za-z][A-Za-z'’,.:;!?]*$/.test(w))
      return words.length >= 4
    }
    for (const m of stripped.matchAll(/"([^"\\\n]{20,})"/g)) {
      if (looksLikeProse(m[1])) lintVoiceRules(`VisionPlanLab.tsx:${lineOf(m.index!)}`, m[1], false, v)
    }

    expect(
      v,
      `Voice rules (docs/plans/life-mastery-intake-redesign.md):\n` +
      `Say "you". One idea per sentence. No em-dashes. No "X, not Y".\n\n` +
      v.map((x) => `${x.where} [${x.rule}]\n    ${x.text}`).join("\n"),
    ).toEqual([])
  })

  it("no guru pronouns in the component's rendered JSX text", () => {
    const src = readFileSync(join(process.cwd(), "src/goals/components/vision-plan/VisionPlanLab.tsx"), "utf8")
    const v: Violation[] = []
    for (const [i, line] of src.split("\n").entries()) {
      const code = line.trim()
      if (code.startsWith("//") || code.startsWith("*") || code.startsWith("/*")) continue
      // JSX text nodes: >…< spans that aren't code
      for (const m of code.matchAll(/>([^<>{}]{12,})</g)) {
        const t = m[1].trim()
        if (!t || /^[\s·|—-]+$/.test(t)) continue
        if (/\b([Hh]e|[Hh]is|[Hh]im)\b(?![a-z])/.test(t)) v.push({ where: `VisionPlanLab.tsx:${i + 1}`, rule: "guru pronoun in JSX", text: t.slice(0, 90) })
      }
    }
    expect(v, `Voice policy v2: the product speaks in OUR voice, never third person about the source coach.\n${v.map((x) => `${x.where}: ${x.text}`).join("\n")}`).toEqual([])
  })
})
