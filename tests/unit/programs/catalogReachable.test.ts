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
 *
 * The one copy that cannot be derived is the database's: `program_drafts`
 * spells the seven ids out in a CHECK, so a discipline added to `DISCIPLINES`
 * alone saves as a 23514 the first time somebody files a draft under it.
 */

import { describe, test, expect } from "vitest"
import fs from "fs"
import path from "path"
import { ALL_PROGRAMS, OFFERED_DISCIPLINES } from "@/src/programs/data/catalog"
import { DISCIPLINES } from "@/src/programs/config"

const projectRoot = path.resolve(__dirname, "../../..")

describe("the catalogue is reachable", () => {
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

  test("no screen spells the catalogue's size as a word", () => {
    // "Thirteen cited programs" was right when it was written and wrong the
    // moment a fourteenth was added — which is what a hand-counted number does.
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules") walk(full)
        } else if (/\.tsx?$/.test(entry.name)) {
          const src = fs.readFileSync(full, "utf-8")
          if (/\b(Eleven|Twelve|Thirteen|Fourteen|Fifteen) cited\b/.test(src)) {
            offenders.push(path.relative(projectRoot, full).replace(/\\/g, "/"))
          }
        }
      }
    }
    walk(path.join(projectRoot, "src"))
    expect(
      offenders,
      "These count the catalogue by hand. Use ALL_PROGRAMS.length:\n" + offenders.join("\n")
    ).toEqual([])
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

describe("the database knows the same disciplines", () => {
  test("program_drafts' CHECK lists exactly the ids DISCIPLINES has", () => {
    /**
     * The newest migration that spells the column's CHECK out wins, so a later
     * ALTER that widens it is what this reads — not the CREATE it replaced.
     */
    const dir = path.join(projectRoot, "supabase/migrations")
    const lists = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".sql"))
      .map((e) => e.name)
      .sort()
      .map((f) => fs.readFileSync(path.join(dir, f), "utf-8"))
      .filter((sql) => /\bprogram_drafts\b/.test(sql))
      .flatMap((sql) => [...sql.matchAll(/CHECK\s*\(\s*discipline\s+IN\s*\(([^)]*)\)\s*\)/gi)])
      .map((m) => [...m[1].matchAll(/'([^']+)'/g)].map((q) => q[1]))

    expect(lists.length, "premise: a migration constrains program_drafts.discipline").toBeGreaterThan(0)
    expect(
      [...lists[lists.length - 1]].sort(),
      "DISCIPLINES and the program_drafts.discipline CHECK disagree. A draft filed\n" +
        "under an id only the code knows is refused by the database on save."
    ).toEqual(Object.keys(DISCIPLINES).sort())
  })
})
