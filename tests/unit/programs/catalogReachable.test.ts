/**
 * EVERY PROGRAM IN THE CATALOGUE CAN BE REACHED, AND THE DISCIPLINES HAVE ONE
 * HOME.
 *
 * The Templates step held a hand-typed list of SIX disciplines. The catalogue
 * has seven, and the seventh — Ironman — holds the Half Ironman plan. So a
 * cited program was unreachable from Life Mastery for as long as that list
 * existed, while the sentence beside it counted it among "thirteen cited
 * programs". Nothing failed; nothing could, because the list was a private copy
 * of a shared fact and no test knew it was a copy.
 *
 * `OFFERED_DISCIPLINES` derives the browsable list, and `DraftBody.discipline`
 * takes its enum from `DISCIPLINES` rather than spelling the seven ids out
 * again. This is what stops the next screen writing its own.
 */

import { describe, test, expect } from "vitest"
import fs from "fs"
import path from "path"
import { ALL_PROGRAMS, OFFERED_DISCIPLINES } from "@/src/programs/data/catalog"
import { DISCIPLINES } from "@/src/programs/config"
import { CreateDraftSchema } from "@/src/programs/schemas"

const projectRoot = path.resolve(__dirname, "../../..")

describe("the catalogue is reachable", () => {
  test("every program is filed under a discipline the vocabulary knows", () => {
    const unknown = ALL_PROGRAMS.filter((p) => !(p.discipline in DISCIPLINES)).map(
      (p) => `${p.id}: ${p.discipline}`
    )
    expect(
      unknown,
      "These programs are filed under a discipline DISCIPLINES has never heard\n" +
        "of, so no screen can offer them:\n" +
        unknown.join("\n")
    ).toEqual([])
  })

  test("every program is under a discipline somebody can browse", () => {
    /**
     * The half that actually bit. A program can be perfectly well filed and
     * still be unreachable, because the browsable list is a different list —
     * and it used to be typed by hand.
     */
    const stranded = ALL_PROGRAMS.filter((p) => !OFFERED_DISCIPLINES.includes(p.discipline)).map(
      (p) => `${p.id} (${p.discipline})`
    )
    expect(
      stranded,
      "These are in the catalogue and cannot be reached from any screen:\n" +
        stranded.join("\n")
    ).toEqual([])
  })

  test("the draft schema accepts every discipline, including the one that was missed", () => {
    const week = {
      kind: "linear_rotation" as const,
      days: [
        {
          id: "a",
          label: "A",
          exercises: [
            {
              id: "sq",
              name: "Squat",
              metricType: "load" as const,
              scheme: { kind: "linear" as const, sets: 3, reps: 5 },
              progression: { kind: "none" as const },
            },
          ],
        },
      ],
    }
    for (const discipline of Object.keys(DISCIPLINES)) {
      const parsed = CreateDraftSchema.safeParse({ name: "W", discipline, schedule: week })
      expect(parsed.success, `the draft schema refuses "${discipline}"`).toBe(true)
    }
    expect(CreateDraftSchema.safeParse({ name: "W", discipline: "quidditch", schedule: week }).success).toBe(
      false
    )
  })
})

describe("the list of disciplines has one home", () => {
  test("no file under src/ writes its own array of discipline ids", () => {
    /**
     * Two or more quoted discipline ids inside one `[...]`, anywhere but the
     * vocabulary itself and the file that derives the browsable list from it.
     * That shape is the hand-typed list, and it is the only reliable way to
     * recognise one: a private copy looks exactly like a legitimate array until
     * you notice what is in it.
     */
    const ids = Object.keys(DISCIPLINES)
    const literal = new RegExp(
      `\\[[^\\]]*?["'](?:${ids.join("|")})["'][^\\]]*?,[^\\]]*?["'](?:${ids.join("|")})["'][^\\]]*?\\]`,
      "s"
    )
    const OWNERS = new Set(["src/programs/config.ts", "src/programs/data/catalog.ts"])

    /**
     * SCOPED TO THE SCREENS THAT COULD OFFER ONE, which is narrower than the
     * step's "no source file under src/". Run over the whole slice tree it
     * named nine files in `src/goals` that have nothing to do with training:
     * the goals vocabulary happens to contain "strength" and "cardio" as its
     * own ids, so any array holding two of them matched. A rule that fires on
     * nine innocent files is a rule somebody turns off.
     */
    const SCOPES = [
      "src/programs",
      "src/goals/components/north-star/WorkoutPrograms.tsx",
      "src/goals/components/north-star/BuildBoard.tsx",
    ]

    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`
        if (entry.isDirectory()) {
          walk(rel)
          continue
        }
        if (!/\.tsx?$/.test(entry.name) || OWNERS.has(rel)) continue
        const code = fs
          .readFileSync(path.join(projectRoot, rel), "utf-8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "")
        if (literal.test(code)) offenders.push(rel)
      }
    }
    for (const scope of SCOPES) {
      if (fs.statSync(path.join(projectRoot, scope)).isDirectory()) walk(scope)
      else {
        const code = fs
          .readFileSync(path.join(projectRoot, scope), "utf-8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "")
        if (literal.test(code)) offenders.push(scope)
      }
    }

    expect(
      offenders,
      "These keep their own list of disciplines. Read OFFERED_DISCIPLINES from\n" +
        "src/programs/data/catalog.ts, or DISCIPLINES from config.ts:\n" +
        offenders.join("\n")
    ).toEqual([])
  })
})
