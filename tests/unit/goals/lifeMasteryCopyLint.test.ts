import { describe, it, expect } from "vitest"
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
})
