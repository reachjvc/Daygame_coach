/**
 * THE TRAINING SCREENS' OWN TYPE FLOOR, AND THE PALETTE THEY MAY NOT SPEAK.
 *
 * `architecture.test.ts` already forbids 10-px type and `zinc-600` across a
 * wide scope with a floor of 11 px, and that rule also guards Life Mastery
 * files that are not training screens, so it keeps its scope and its floor.
 * Nothing forbade 11-px type, the zinc/sky palette at any shade, or a 12.5-px
 * input — which is how an iPhone-zooming box and a whole second colour scheme
 * shipped on these screens.
 *
 * So the STRICTER training floor gets one owner, and this is it.
 *
 * COUNTS PER FILE, NOT LINE NUMBERS. The step asked for one allowlist entry per
 * file:line, each asserted to still exist. A line number goes stale the moment
 * anything above it is edited, so that list would spend its life being
 * renumbered and would eventually be renumbered wrongly. A count is the
 * `TRAINING_BROWSER_CLOCK_ALLOWED` pattern this repo already uses, it is
 * asserted EXACTLY rather than as a ceiling — a file that drops one must lower
 * its number in the same sitting — and it cannot go stale for a reason that has
 * nothing to do with the rule.
 *
 * RULE (c) OF THE STEP IS NOT HERE. "No rename inside an onChange" is owned by
 * `dayNameRule.test.ts`, which has held it since the day it was found and which
 * also covers `components/` and `app/`. A second copy would be a second thing
 * to keep in step, and the copies drift.
 */

import { describe, test, expect } from "vitest"
import fs from "fs"
import path from "path"

const projectRoot = path.resolve(__dirname, "../../..")

/**
 * Every training screen: the whole programs components tree, plus the three
 * Life Mastery files that draw training.
 */
function trainingFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.tsx?$/.test(entry.name)) out.push(rel)
    }
  }
  walk("src/programs/components")
  out.push(
    "src/goals/components/north-star/WorkoutPrograms.tsx",
    "src/goals/components/north-star/RoutineCard.tsx",
    "src/goals/components/north-star/BuildBoard.tsx"
  )
  return out.sort()
}

/** Comments blanked: a sentence about a class is not a class. */
function code(rel: string): string {
  return fs
    .readFileSync(path.join(projectRoot, rel), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
}

/** The second language: the blue-grey palette, and type nobody can read. */
const OLD_LANGUAGE = /\bzinc-\d|\bsky-\d|text-\[(?:9|10|10\.5|11|11\.5)px\]/g

/**
 * SEEDED BY RUNNING THE SCANNER on 2026-09-23, not by typing filenames.
 *
 * `CustomProgramBuilder.tsx` and `ui.tsx` are deleted by step 10 and step 12 of
 * the same plan. `BuildBoard.tsx` and `RoutineCard.tsx` are Life Mastery's own
 * zinc shell, which Phase 9 repaints; Phase 8 took the training parts of them
 * off this count and not the rest. The three ones are: the set grid's caption
 * row (spec S3 item 8 — permanent), one line in `ProgressionView`, and the
 * `trainingStyles.ts` constant that OWNS the caption.
 */
const TYPE_FLOOR_ALLOWED: Record<string, number> = {
  "src/goals/components/north-star/BuildBoard.tsx": 91,
  "src/goals/components/north-star/RoutineCard.tsx": 102,
  "src/programs/components/ProgressionView.tsx": 1,
  "src/programs/components/live/LiveWorkoutScreen.tsx": 1,
  "src/programs/components/trainingStyles.ts": 1,
}

const found = (): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const rel of trainingFiles()) {
    const n = (code(rel).match(OLD_LANGUAGE) ?? []).length
    if (n > 0) out[rel] = n
  }
  return out
}

describe("no training screen speaks the old visual language", () => {
  test("no NEW file uses the zinc/sky palette or type under 12 px", () => {
    const offenders = Object.entries(found())
      .filter(([rel]) => !(rel in TYPE_FLOOR_ALLOWED))
      .map(([rel, n]) => `${rel}: ${n}`)

    expect(
      offenders,
      "These use the blue-grey palette or type nobody can read at arm's length.\n" +
        "Tokens live in src/programs/components/trainingStyles.ts and components/ui:\n" +
        offenders.join("\n")
    ).toEqual([])
  })

  test("the allowance is exact, so a file that drops one lowers its number", () => {
    /**
     * EXACT, not a ceiling. A ceiling with headroom passes and protects
     * nothing, and that is the failure mode that hides best: everything green
     * while the slack sits there waiting for a regression to fill it.
     */
    const live = found()
    const wrong = Object.entries(TYPE_FLOOR_ALLOWED)
      .filter(([rel, n]) => (live[rel] ?? 0) !== n)
      .map(([rel, n]) => `${rel}: allowance ${n}, actually ${live[rel] ?? 0}`)

    expect(
      wrong,
      "Update these numbers in TYPE_FLOOR_ALLOWED — down when a file is cleaned,\n" +
        "and remove the entry entirely when it reaches zero:\n" +
        wrong.join("\n")
    ).toEqual([])
  })
})

describe("the blue-grey kit is gone, not repainted", () => {
  test("src/programs/components/ui.tsx does not exist and nothing imports it", () => {
    /**
     * `TYPE`, `IconButton`, `Segmented`, `Field`, `Stepper`, `Panel`, `Action`
     * and `GroupLabel` — a whole second component library for one slice, with
     * its own type scale and its own greys. Four screens imported it and each
     * of them looked like a different app from the one around it.
     *
     * Deleted rather than repainted: a repainted kit is still a second answer
     * to "what does a button look like", and the answer is `components/ui`.
     */
    expect(
      fs.existsSync(path.join(projectRoot, "src/programs/components/ui.tsx")),
      "the kit is back — the app's kit is components/ui"
    ).toBe(false)

    const importers: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`
        if (entry.isDirectory()) walk(rel)
        else if (/\.tsx?$/.test(entry.name)) {
          const src = fs.readFileSync(path.join(projectRoot, rel), "utf-8")
          if (/from\s+["'](?:\.\/ui|@\/src\/programs\/components\/ui)["']/.test(src)) importers.push(rel)
        }
      }
    }
    for (const dir of ["src", "app"]) walk(dir)

    expect(importers, "These still import the deleted kit:\n" + importers.join("\n")).toEqual([])
  })
})

describe("no training box makes an iPhone zoom the page", () => {
  /**
   * A typed box under 16 px makes iOS Safari zoom the whole page on focus, and
   * it does not zoom back. `sm:` and `md:` sizes are desktop and are fine.
   */
  const SMALL_TEXT = /(?<!sm:)(?<!md:)\btext-(?:xs|sm|\[1[0-5](?:\.5)?px\])\b/

  test("every typed box is 16 px on a phone", () => {
    const offenders: string[] = []
    for (const rel of trainingFiles()) {
      for (const [tag] of code(rel).matchAll(/<(?:input|select|textarea)\b[^>]*>/g)) {
        const classes = tag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/)
        const value = classes?.[1] ?? classes?.[2] ?? ""
        if (SMALL_TEXT.test(value)) offenders.push(`${rel}: ${value.slice(0, 60)}`)
      }
    }
    expect(
      offenders,
      "Tapping a box smaller than 16px zooms iOS Safari and it does not zoom\n" +
        "back. Use the default size and shrink with sm: if you must:\n" +
        offenders.join("\n")
    ).toEqual([])
  })

  /**
   * A raw `<input` is how every one of the 12.5-px boxes got there: `Input` is
   * 16 px on a phone by construction, and a hand-rolled box is that size
   * decision made again, by hand, by whoever is next.
   *
   * COUNTED RATHER THAN FORBIDDEN, and exactly, because Phase 8 took the
   * TRAINING parts of these two files and not the rest: the six that remain are
   * the routine's own name box, its step minutes and the "add your own" boxes,
   * which belong to routines in general and which Phase 9 repaints. Forbidding
   * them outright here would be claiming a fix that has not been made; leaving
   * them uncounted would let a seventh in for free.
   */
  const RAW_INPUTS_ALLOWED: Record<string, number> = {
    "src/goals/components/north-star/RoutineCard.tsx": 4,
    "src/goals/components/north-star/BuildBoard.tsx": 2,
  }

  test("Life Mastery's training files use the app's Input, and the raw ones only shrink", () => {
    const screens = [
      "src/goals/components/north-star/WorkoutPrograms.tsx",
      "src/goals/components/north-star/RoutineCard.tsx",
      "src/goals/components/north-star/BuildBoard.tsx",
    ]
    const live = Object.fromEntries(
      screens.map((rel) => [rel, (code(rel).match(/<input\b/g) ?? []).length])
    )
    const wrong = screens
      .filter((rel) => live[rel] !== (RAW_INPUTS_ALLOWED[rel] ?? 0))
      .map((rel) => `${rel}: allowance ${RAW_INPUTS_ALLOWED[rel] ?? 0}, actually ${live[rel]}`)

    expect(
      wrong,
      "Use `Input` from components/ui/input.tsx, and lower the number here when\n" +
        "one goes — an allowance with headroom protects nothing:\n" +
        wrong.join("\n")
    ).toEqual([])
  })
})

describe("green is not a button", () => {
  test("no Button or Link in a training screen is painted emerald", () => {
    /**
     * Green in this app means finished: a set you ticked, a rest that is over,
     * a program complete. A save button wearing it takes that meaning away from
     * the ticks that need it — which is exactly what "Start tracking this" and
     * "Save changes" did on two different screens.
     */
    const offenders: string[] = []
    for (const rel of trainingFiles()) {
      for (const [tag] of code(rel).matchAll(/<(?:Button|Link)\b[\s\S]{0,300}?>/g)) {
        if (/emerald-/.test(tag)) offenders.push(`${rel}: ${tag.slice(0, 80).replace(/\s+/g, " ")}`)
      }
    }
    expect(
      offenders,
      "Green is 'finished' and nothing else. Orange is 'do this', amber is\n" +
        "'that did not work':\n" +
        offenders.join("\n")
    ).toEqual([])
  })
})
