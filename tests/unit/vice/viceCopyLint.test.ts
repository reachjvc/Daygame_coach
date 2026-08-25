/**
 * Copy lint for the quit-a-vice module.
 *
 * Two of these rules are content policy rather than style, and both of them
 * will drift back the moment somebody edits a string without knowing why it was
 * written that way — which is exactly what a lint is for.
 *
 *   1. **No controlling language.** "You should", "you must", "make sure you".
 *      Telling somebody who is ambivalent about a habit what to do produces
 *      resistance to the instruction, and this whole module exists for people
 *      who are ambivalent about a habit.
 *   2. **Never the word "addiction" about a person or a behaviour.** Compulsive
 *      sexual behaviour is not classified as an addiction, and a large share of
 *      people who describe themselves that way turn out to have a conflict
 *      between their behaviour and their values rather than a dependence.
 *      Telling that person their brain is broken is both wrong and harmful.
 *   3. **Never promise how long an urge lasts.** The twenty-minute figure
 *      everybody repeats has no primary source, and a promise the page cannot
 *      keep costs more trust than it buys.
 *
 * Plus the prose rules the Life Mastery lint next door already enforces, for
 * the same reason: these strings are read as writing, not as data.
 */

import { describe, it, expect } from "vitest"
import {
  BINDING,
  COPING_MOVES,
  DISTRACTION_BUCKETS,
  FEELINGS,
  IFTHEN,
  IMPORTANCE_RULER,
  CONFIDENCE_RULER,
  LANGUAGE_RULES,
  LAPSE,
  PERMISSION_THOUGHTS,
  PROVENANCE,
  REBUTTAL_METHOD,
  REFUSAL,
  RULER_NOTE,
  SAFETY,
  URGE,
  VOICE,
} from "@/src/vice/data/copy"
import { MISSIONS, VICE_FLOWS } from "@/src/vice/data/flows"
import { BODY_PLACES, BODY_TEXTURES, EXTERNAL_TRIGGERS, INTERNAL_TRIGGERS, VICES } from "@/src/vice/data/vices"
import {
  COUNT,
  COUNT_BANDS,
  DOORS,
  FEEDBACK,
  IMPACT_CRITERIA,
  INCONGRUENCE,
  SUBSTANCE_CRITERIA,
  TRAJECTORY,
  USAGE,
  WHERE_INTRO,
} from "@/src/vice/data/awareness"
import { HELP, SERVICES } from "@/src/vice/data/help"
import {
  BELIEFS,
  BELIEF_TEST,
  FUTURES,
  GIVES_INTRO,
  HORIZONS,
  IMPACT_BELIEFS,
  LETTER,
  SUBSTANCE_BELIEFS,
  VALUES,
  VALUES_STEP,
} from "@/src/vice/data/gives"

interface Violation { where: string; rule: string; text: string }
const violations: Violation[] = []

const CONTROL = new RegExp(`\\b(${LANGUAGE_RULES.bannedControl.map((w) => w.replace(/ /g, "\\s+")).join("|")})\\b`, "i")
const DIAGNOSIS = new RegExp(`\\b(${LANGUAGE_RULES.bannedDiagnosis.join("|")})\\b`, "i")
const CHEER = new RegExp(LANGUAGE_RULES.bannedCheer.map((w) => w.replace(/ /g, "\\s+").replace(/'/g, "['’]")).join("|"), "i")
/** Any claim that an urge lasts a specific length of time. */
const DURATION_PROMISE = /\b(urges?|cravings?)\b[^.]{0,60}\b(last|lasts|only last|pass in)\b[^.]{0,20}\d+\s*(minute|min)/i
/**
 * Phrasing that reads as machine-written.
 *
 * A trust rule rather than a taste one: a person deciding whether to believe a
 * page about their drinking is reading for whether a human wrote it, and a page
 * that sounds generated gets its numbers discounted along with its prose.
 */
const MACHINE = new RegExp(
  LANGUAGE_RULES.bannedMachineTells.map((w) => w.replace(/ /g, "\\s+").replace(/'/g, "['’]")).join("|"),
  "i",
)

function lintAll(where: string, text: string, { prose }: { prose: boolean }) {
  const t = text.trim()
  if (!t) return

  if (CONTROL.test(t)) violations.push({ where, rule: "controlling language", text: t.slice(0, 90) })
  if (DIAGNOSIS.test(t) && !LANGUAGE_RULES.diagnosisExemptIds.some((id) => where.startsWith(id))) {
    violations.push({ where, rule: "diagnosis word", text: t.slice(0, 90) })
  }
  if (DURATION_PROMISE.test(t)) violations.push({ where, rule: "promises an urge duration", text: t.slice(0, 90) })
  if (CHEER.test(t)) violations.push({ where, rule: "empty encouragement", text: t.slice(0, 90) })
  if (MACHINE.test(t)) violations.push({ where, rule: "reads as machine-written", text: t.slice(0, 90) })
  if (LANGUAGE_RULES.bannedEmphasisShape.test(t)) {
    violations.push({ where, rule: "\"not just X but Y\"", text: t.slice(0, 90) })
  }
  if (t.includes("  ")) violations.push({ where, rule: "double space", text: t.slice(0, 90) })
  if (((t.match(/"/g) ?? []).length % 2) !== 0) violations.push({ where, rule: "unbalanced quotes", text: t.slice(0, 90) })
  if (/&(ldquo|rdquo|apos|amp|nbsp);/.test(t)) violations.push({ where, rule: "html entity in data", text: t.slice(0, 90) })

  if (prose && t.length > 60 && !/[.!?…")\]]$/.test(t)) {
    violations.push({ where, rule: "no terminal punctuation", text: `…${t.slice(-60)}` })
  }
}

const prose = (where: string, text: string) => lintAll(where, text, { prose: true })
const label = (where: string, text: string) => lintAll(where, text, { prose: false })

describe("quit-a-vice copy lint", () => {
  it("finds zero violations across every user-facing string", () => {
    // --- the vice catalogue
    for (const vice of VICES) {
      label(`VICES.${vice.id}.label`, vice.label)
      label(`VICES.${vice.id}.unit`, vice.unit)
      vice.triggerSeeds.forEach((seed, i) => label(`VICES.${vice.id}.triggerSeeds[${i}]`, seed))
    }
    for (const list of [EXTERNAL_TRIGGERS, INTERNAL_TRIGGERS, BODY_PLACES, BODY_TEXTURES, FEELINGS]) {
      list.forEach((item, i) => label(`chipBank[${i}]`, item))
    }

    // --- safety
    label("SAFETY.title", SAFETY.title)
    prose("SAFETY.blurb", SAFETY.blurb)
    prose("SAFETY.question", SAFETY.question)
    SAFETY.signs.forEach((sign, i) => label(`SAFETY.signs[${i}]`, sign))
    label("SAFETY.noneLabel", SAFETY.noneLabel)
    label("SAFETY.warningTitle", SAFETY.warningTitle)
    SAFETY.warning.forEach((line, i) => prose(`SAFETY.warning[${i}]`, line))
    label("SAFETY.acknowledge", SAFETY.acknowledge)
    prose("SAFETY.banner", SAFETY.banner)

    // --- rulers
    for (const [name, ruler] of [["IMPORTANCE_RULER", IMPORTANCE_RULER], ["CONFIDENCE_RULER", CONFIDENCE_RULER]] as const) {
      prose(`${name}.question`, ruler.question)
      label(`${name}.lowAnchor`, ruler.lowAnchor)
      label(`${name}.highAnchor`, ruler.highAnchor)
      prose(`${name}.zeroFallback`, ruler.zeroFallback)
      prose(`${name}.tenFallback`, ruler.tenFallback)
      // The templates carry {n}/{lower}/{up}, so only the non-prose rules apply.
      label(`${name}.whyNotLower`, ruler.whyNotLower)
      label(`${name}.whatWouldMove`, ruler.whatWouldMove)
    }
    prose("RULER_NOTE", RULER_NOTE)

    // --- the urge tool
    label("URGE.title", URGE.title)
    prose("URGE.standing", URGE.standing)
    prose("URGE.durationPolicy", URGE.durationPolicy)
    for (const [key, step] of Object.entries(URGE.steps)) {
      for (const [field, value] of Object.entries(step)) {
        if (typeof value !== "string") continue
        if (field === "title") label(`URGE.steps.${key}.${field}`, value)
        else prose(`URGE.steps.${key}.${field}`, value)
      }
      if ("options" in step) step.options.forEach((o, i) => label(`URGE.steps.${key}.options[${i}]`, o))
    }

    // --- the voice
    label("VOICE.title", VOICE.title)
    prose("VOICE.blurb", VOICE.blurb)
    prose("VOICE.nameHelp", VOICE.nameHelp)
    label("VOICE.saysLabel", VOICE.saysLabel)
    label("VOICE.backLabel", VOICE.backLabel)
    VOICE.nameSeeds.forEach((s, i) => label(`VOICE.nameSeeds[${i}]`, s))
    VOICE.saysSeeds.forEach((s, i) => prose(`VOICE.saysSeeds[${i}]`, s))
    VOICE.backSeeds.forEach((s, i) => prose(`VOICE.backSeeds[${i}]`, s))
    prose("VOICE.swapDemo.from", VOICE.swapDemo.from)
    prose("VOICE.swapDemo.to", VOICE.swapDemo.to)

    // --- permission thoughts. The thoughts themselves are the vice talking, so
    // they are exempt from the control-language rule and nothing else.
    for (const item of PERMISSION_THOUGHTS) {
      label(`PERMISSION_THOUGHTS.${item.id}.kind`, item.kind)
      prose(`PERMISSION_THOUGHTS.${item.id}.rebuttal`, item.rebuttal)
    }
    label("REBUTTAL_METHOD.title", REBUTTAL_METHOD.title)
    prose("REBUTTAL_METHOD.interrupt", REBUTTAL_METHOD.interrupt)
    REBUTTAL_METHOD.steps.forEach((s, i) => prose(`REBUTTAL_METHOD.steps[${i}]`, s))

    // --- refusal
    label("REFUSAL.title", REFUSAL.title)
    prose("REFUSAL.blurb", REFUSAL.blurb)
    REFUSAL.rules.forEach((r, i) => prose(`REFUSAL.rules[${i}]`, r))
    REFUSAL.ladder.forEach((l, i) => prose(`REFUSAL.ladder[${i}]`, l))
    prose("REFUSAL.brokenRecord", REFUSAL.brokenRecord)
    REFUSAL.scriptFields.forEach((f) => prose(`REFUSAL.scriptFields.${f.id}`, f.label))
    prose("REFUSAL.rehearse", REFUSAL.rehearse)
    prose("REFUSAL.autonomy", REFUSAL.autonomy)

    // --- coping
    for (const bucket of DISTRACTION_BUCKETS) {
      label(`DISTRACTION_BUCKETS.${bucket.id}.label`, bucket.label)
      bucket.seeds.forEach((s, i) => label(`DISTRACTION_BUCKETS.${bucket.id}.seeds[${i}]`, s))
    }
    for (const group of [...COPING_MOVES.external, ...COPING_MOVES.internal]) {
      label(`COPING_MOVES.${group.id}.label`, group.label)
      if ("help" in group && group.help) prose(`COPING_MOVES.${group.id}.help`, group.help)
    }

    // --- the lapse tool
    label("LAPSE.title", LAPSE.title)
    prose("LAPSE.opener", LAPSE.opener)
    prose("LAPSE.compassion.prompt", LAPSE.compassion.prompt)
    prose("LAPSE.compassion.draft", LAPSE.compassion.draft)
    LAPSE.questions.forEach((q) => prose(`LAPSE.questions.${q.id}`, q.label))
    label("LAPSE.chain.title", LAPSE.chain.title)
    prose("LAPSE.chain.blurb", LAPSE.chain.blurb)
    prose("LAPSE.chain.prompt", LAPSE.chain.prompt)
    prose("LAPSE.chain.pivot", LAPSE.chain.pivot)
    prose("LAPSE.chain.pivotHelp", LAPSE.chain.pivotHelp)
    prose("LAPSE.chain.earliest", LAPSE.chain.earliest)
    label("LAPSE.onward.label", LAPSE.onward.label)
    for (const k of ["again", "againWhy", "tripwire", "tripwireWhy"] as const) {
      prose(`LAPSE.onward.${k}`, LAPSE.onward[k])
    }
    label("LAPSE.next.title", LAPSE.next.title)
    LAPSE.next.lines.forEach((l, i) => prose(`LAPSE.next.lines[${i}]`, l))
    prose("LAPSE.next.field", LAPSE.next.field)
    prose("LAPSE.next.notStartingOver", LAPSE.next.notStartingOver)

    // --- if-then
    label("IFTHEN.title", IFTHEN.title)
    prose("IFTHEN.blurb", IFTHEN.blurb)
    label("IFTHEN.whenLabel", IFTHEN.whenLabel)
    label("IFTHEN.thenLabel", IFTHEN.thenLabel)
    label("IFTHEN.whenPlaceholder", IFTHEN.whenPlaceholder)
    label("IFTHEN.thenPlaceholder", IFTHEN.thenPlaceholder)
    prose("IFTHEN.rejectNegation", IFTHEN.rejectNegation)
    prose("IFTHEN.vagueCue", IFTHEN.vagueCue)
    prose("IFTHEN.rehearse", IFTHEN.rehearse)

    // --- binding
    label("BINDING.title", BINDING.title)
    prose("BINDING.blurb", BINDING.blurb)
    for (const group of BINDING.groups) {
      label(`BINDING.${group.id}.label`, group.label)
      prose(`BINDING.${group.id}.help`, group.help)
      group.seeds.forEach((s, i) => label(`BINDING.${group.id}.seeds[${i}]`, s))
    }

    // --- provenance. Exempt from the diagnosis rule: it is describing the
    // research rather than describing the reader.
    label("hub.provenance.title", PROVENANCE.title)
    PROVENANCE.lines.forEach((l, i) => prose(`hub.provenance.lines[${i}]`, l))
    prose("hub.evidence", PROVENANCE.evidence)

    // --- flows and missions
    for (const flow of VICE_FLOWS) {
      label(`FLOW.${flow.id}.label`, flow.label)
      prose(`FLOW.${flow.id}.pitch`, flow.pitch)
      prose(`FLOW.${flow.id}.forWho`, flow.forWho)
      prose(`FLOW.${flow.id}.asks`, flow.asks)
      prose(`FLOW.${flow.id}.basis`, flow.basis)
      for (const step of flow.steps) {
        label(`FLOW.${flow.id}.${step.id}.title`, step.title)
        prose(`FLOW.${flow.id}.${step.id}.blurb`, step.blurb)
        if (step.caution) prose(`FLOW.${flow.id}.${step.id}.caution`, step.caution)
        if (step.source) prose(`FLOW.${flow.id}.${step.id}.source`, step.source)
        step.body?.forEach((b, i) => prose(`FLOW.${flow.id}.${step.id}.body[${i}]`, b))
        step.fields?.forEach((f) => {
          prose(`FLOW.${flow.id}.${step.id}.${f.id}.label`, f.label)
          if (f.help) prose(`FLOW.${flow.id}.${step.id}.${f.id}.help`, f.help)
          if (f.placeholder) label(`FLOW.${flow.id}.${step.id}.${f.id}.placeholder`, f.placeholder)
        })
        step.chips?.forEach((c) => {
          label(`FLOW.${flow.id}.${step.id}.${c.id}.label`, c.label)
          if (c.help) prose(`FLOW.${flow.id}.${step.id}.${c.id}.help`, c.help)
          c.options.forEach((o, i) => label(`FLOW.${flow.id}.${step.id}.${c.id}.options[${i}]`, o))
        })
      }
    }
    for (const mission of MISSIONS) {
      label(`MISSIONS.${mission.day}.title`, mission.title)
      prose(`MISSIONS.${mission.day}.body`, mission.body)
    }

    // --- the awareness flow
    for (const criterion of [...SUBSTANCE_CRITERIA, ...IMPACT_CRITERIA]) {
      prose(`CRITERIA.${criterion.id}.text`, criterion.text)
      if (criterion.help) prose(`CRITERIA.${criterion.id}.help`, criterion.help)
    }
    label("COUNT.title", COUNT.title)
    for (const key of ["blurb", "window", "unsureNote", "substanceNote", "impactNote"] as const) {
      prose(`COUNT.${key}`, COUNT[key])
    }
    for (const key of ["yes", "no", "unsure"] as const) label(`COUNT.${key}`, COUNT[key])
    prose("INCONGRUENCE.question", INCONGRUENCE.question)
    for (const option of INCONGRUENCE.options) {
      label(`INCONGRUENCE.${option.id}.label`, option.label)
      if (option.help) prose(`INCONGRUENCE.${option.id}.help`, option.help)
    }
    prose("INCONGRUENCE.movingNote", INCONGRUENCE.movingNote)
    for (const [k, v] of Object.entries(INCONGRUENCE.notes)) prose(`INCONGRUENCE.notes.${k}`, v)
    for (const band of COUNT_BANDS) {
      label(`COUNT_BANDS.${band.min}.label`, band.label)
      prose(`COUNT_BANDS.${band.min}.meaning`, band.meaning)
    }
    label("FEEDBACK.title", FEEDBACK.title)
    for (const key of ["blurb", "elicitFirst", "elicitAfter", "notADiagnosis", "resolvable", "withdrawalFlag", "impactNote"] as const) {
      prose(`FEEDBACK.${key}`, FEEDBACK[key])
    }
    for (const key of ["countLabel", "unsureLabel"] as const) label(`FEEDBACK.${key}`, FEEDBACK[key])
    label("USAGE.title", USAGE.title)
    for (const key of ["blurb", "why", "noCurrencyNote", "guessClose"] as const) prose(`USAGE.${key}`, USAGE[key])
    for (const key of ["reveal", "perWeek", "perYear", "daysOfYear", "guessGap"] as const) label(`USAGE.${key}`, USAGE[key])
    for (const key of ["days", "perDay", "cost", "minutes", "guess"] as const) {
      prose(`USAGE.${key}.label`, USAGE[key].label)
      if ("help" in USAGE[key]) prose(`USAGE.${key}.help`, (USAGE[key] as { help: string }).help)
      label(`USAGE.${key}.placeholder`, USAGE[key].placeholder)
    }
    label("TRAJECTORY.title", TRAJECTORY.title)
    prose("TRAJECTORY.blurb", TRAJECTORY.blurb)
    prose("TRAJECTORY.closing", TRAJECTORY.closing)
    label("DOORS.title", DOORS.title)
    prose("DOORS.blurb", DOORS.blurb)
    prose("DOORS.reflect.label", DOORS.reflect.label)
    for (const option of DOORS.options) {
      label(`DOORS.${option.id}.label`, option.label)
      prose(`DOORS.${option.id}.help`, option.help)
    }
    WHERE_INTRO.body.forEach((b, i) => prose(`WHERE_INTRO.body[${i}]`, b))
    prose("WHERE_INTRO.caution", WHERE_INTRO.caution)

    // --- the help door
    label("HELP.title", HELP.title)
    for (const key of ["crisisHeading", "crisisBlurb", "ceiling", "localeQuestion", "localeNote", "verifiedNote"] as const) {
      prose(`HELP.${key}`, HELP[key])
    }
    for (const block of [HELP.badEnough, HELP.notRehab, HELP.notAbstinence, HELP.medication]) {
      label(`HELP.${block.title}`, block.title)
      block.lines.forEach((line, i) => prose(`HELP.${block.title}.lines[${i}]`, line))
    }
    for (const item of HELP.barriers) {
      // The barrier is the reader's own sentence, quoted back. Exempt from the
      // control rule for the same reason the permission thoughts are: it is the
      // objection being named, not the page issuing one.
      prose(`HELP.barriers.${item.id}.answer`, item.answer)
    }
    label("HELP.plan.title", HELP.plan.title)
    prose("HELP.plan.blurb", HELP.plan.blurb)
    prose("HELP.plan.done", HELP.plan.done)
    for (const key of ["whenPlaceholder", "thenPlaceholder"] as const) label(`HELP.plan.${key}`, HELP.plan[key])
    // --- what it gives you
    for (const belief of [...SUBSTANCE_BELIEFS, ...IMPACT_BELIEFS]) {
      prose(`BELIEFS.${belief.id}.claim`, belief.claim)
      prose(`BELIEFS.${belief.id}.check`, belief.check)
    }
    label("BELIEFS.title", BELIEFS.title)
    for (const key of ["blurb", "instruction", "why", "empty"] as const) prose(`BELIEFS.${key}`, BELIEFS[key])
    for (const key of ["scaleLow", "scaleHigh"] as const) label(`BELIEFS.${key}`, BELIEFS[key])
    label("BELIEF_TEST.title", BELIEF_TEST.title)
    for (const key of ["blurb", "intro", "noLog", "decay"] as const) prose(`BELIEF_TEST.${key}`, BELIEF_TEST[key])
    for (const key of ["findingLabel", "fromLog", "summaryHeld", "summaryFell"] as const) {
      label(`BELIEF_TEST.${key}`, BELIEF_TEST[key])
    }
    for (const verdict of BELIEF_TEST.verdicts) {
      label(`BELIEF_TEST.${verdict.id}.label`, verdict.label)
      prose(`BELIEF_TEST.${verdict.id}.help`, verdict.help)
    }
    VALUES.forEach((v, i) => label(`VALUES[${i}]`, v))
    label("VALUES_STEP.title", VALUES_STEP.title)
    for (const key of ["blurb", "pickHelp", "topHelp", "livingHelp", "servesHelp", "costsHelp", "closing"] as const) {
      prose(`VALUES_STEP.${key}`, VALUES_STEP[key])
    }
    for (const key of ["pickLabel", "topLabel", "livingLabel", "servesLabel", "costsLabel"] as const) {
      label(`VALUES_STEP.${key}`, VALUES_STEP[key])
    }
    for (const horizon of HORIZONS) {
      label(`HORIZONS.${horizon.id}.label`, horizon.label)
      prose(`HORIZONS.${horizon.id}.hint`, horizon.hint)
    }
    label("FUTURES.title", FUTURES.title)
    for (const key of ["blurb", "unchangedHelp", "changedHelp", "order", "why", "useNote"] as const) {
      prose(`FUTURES.${key}`, FUTURES[key])
    }
    for (const key of ["unchangedLabel", "changedLabel"] as const) label(`FUTURES.${key}`, FUTURES[key])
    FUTURES.rules.forEach((r, i) => prose(`FUTURES.rules[${i}]`, r))
    label("LETTER.title", LETTER.title)
    for (const key of ["blurb", "earlyNote", "provenance", "savedNote"] as const) prose(`LETTER.${key}`, LETTER[key])
    for (const option of LETTER.options) {
      label(`LETTER.${option.id}.label`, option.label)
      prose(`LETTER.${option.id}.help`, option.help)
      prose(`LETTER.${option.id}.prompt`, option.prompt)
      // The seeds for the "from" letter are the vice talking, so they are
      // exempt from the control rule for the same reason the permission
      // thoughts are: it is the thing being quoted, not the page instructing.
      option.seeds.forEach((seed, i) => lintAll(`LETTER.${option.id}.seeds[${i}]`, seed, { prose: true }))
    }
    GIVES_INTRO.body.forEach((b, i) => prose(`GIVES_INTRO.body[${i}]`, b))
    prose("GIVES_INTRO.caution", GIVES_INTRO.caution)

    for (const region of Object.values(SERVICES)) {
      label(`SERVICES.${region.label}`, region.label)
      for (const service of region.items) {
        label(`SERVICES.${service.name}.name`, service.name)
        label(`SERVICES.${service.name}.contact`, service.contact)
        prose(`SERVICES.${service.name}.note`, service.note)
      }
    }

    expect(
      violations,
      `Copy violations:\n${violations.map((v) => `  [${v.rule}] ${v.where}\n    ${v.text}`).join("\n")}`,
    ).toHaveLength(0)
  })
})

describe("the rules the lint enforces are real rules", () => {
  it("catches controlling language when it is there", () => {
    const caught: Violation[] = []
    const before = violations.length
    lintAll("test", "You should log every urge.", { prose: true })
    caught.push(...violations.splice(before))
    expect(caught.map((v) => v.rule)).toContain("controlling language")
  })

  it("catches the word addiction", () => {
    const before = violations.length
    lintAll("test", "Your addiction is in charge here.", { prose: true })
    const caught = violations.splice(before)
    expect(caught.map((v) => v.rule)).toContain("diagnosis word")
  })

  it("catches empty encouragement", () => {
    const before = violations.length
    lintAll("test", "You've got this! Stay positive.", { prose: true })
    const caught = violations.splice(before)
    expect(caught.map((v) => v.rule)).toContain("empty encouragement")
  })

  it("catches phrasing that reads as machine-written", () => {
    const before = violations.length
    lintAll("test", "Let us delve into your journey and unlock your potential.", { prose: true })
    const caught = violations.splice(before)
    expect(caught.map((v) => v.rule)).toContain("reads as machine-written")
  })

  it("catches the \"not just X but Y\" construction", () => {
    const before = violations.length
    lintAll("test", "This is not just a habit but a whole way of living.", { prose: true })
    const caught = violations.splice(before)
    expect(caught.map((v) => v.rule)).toContain("\"not just X but Y\"")
  })

  it("catches a promise about how long an urge lasts", () => {
    const before = violations.length
    lintAll("test", "Hold on — urges only last 20 minutes.", { prose: true })
    const caught = violations.splice(before)
    expect(caught.map((v) => v.rule)).toContain("promises an urge duration")
  })
})

describe("structural guarantees the copy has to keep", () => {
  it("keeps the standing line on the urge tool free of any demand", () => {
    // The tool stops working the moment it reads as a test, because the honest
    // entries stop arriving and the log is what everything else runs on.
    expect(URGE.standing.toLowerCase()).toContain("still do it")
    expect(URGE.standing.toLowerCase()).toContain("not a test")
  })

  it("offers the lapse screen no counter to reset", () => {
    const lapseText = [LAPSE.opener, ...LAPSE.next.lines, LAPSE.compassion.draft].join(" ").toLowerCase()
    expect(lapseText).not.toMatch(/\bstreak\b/)
    expect(lapseText).not.toMatch(/back to (zero|day one|day 1)/)
  })

  it("gives every permission thought a rebuttal", () => {
    for (const item of PERMISSION_THOUGHTS) {
      expect(item.rebuttal.trim().length, item.id).toBeGreaterThan(10)
      expect(item.thought.trim().length, item.id).toBeGreaterThan(5)
    }
    expect(new Set(PERMISSION_THOUGHTS.map((p) => p.id)).size).toBe(PERMISSION_THOUGHTS.length)
  })

  it("runs the mission sequence from day one with no gaps and no repeats", () => {
    expect(MISSIONS.map((m) => m.day)).toEqual(MISSIONS.map((_, i) => i + 1))
  })

  it("names a source for the steps that reproduce published material", () => {
    const sourced = VICE_FLOWS.flatMap((f) => f.steps).filter((s) => s.source)
    expect(sourced.length).toBeGreaterThan(0)
  })
})
