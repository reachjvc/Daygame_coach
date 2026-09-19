/**
 * EVERY PROGRAM IN THE CATALOGUE IS ONE SOMEBODY CAN REACH.
 *
 * The list of disciplines a person could browse was typed by hand in the
 * Templates step and named six. The catalogue has seven, and the seventh —
 * Ironman — holds the Half Ironman plan. So that program was in the app, fully
 * built, counted by the sentence beside the list ("Thirteen cited programs")
 * and reachable from no screen at all.
 *
 * The list is derived now. These tests are what stop the two drifting again:
 * one fails if a program is filed under a discipline nobody offers, the other
 * if a discipline is offered with nothing in it.
 */

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import { ALL_PROGRAMS, OFFERED_DISCIPLINES, programsByDiscipline } from "@/src/programs/data/catalog"
import { DISCIPLINES } from "@/src/programs/config"

describe("the catalogue and what is offered", () => {
  it("every browsable program sits under an offered discipline", () => {
    const orphaned = ALL_PROGRAMS.filter((p) => !OFFERED_DISCIPLINES.includes(p.discipline)).map(
      (p) => `${p.name} (${p.discipline})`
    )
    expect(
      orphaned,
      "These programs exist and no screen can reach them:\n" + orphaned.join("\n")
    ).toEqual([])
  })

  it("an offered discipline always has at least one program", () => {
    const empty = OFFERED_DISCIPLINES.filter((d) => programsByDiscipline(d).length === 0)
    expect(empty, "These disciplines are offered and open onto nothing:\n" + empty.join("\n")).toEqual(
      []
    )
  })

  it("offers every implemented discipline that has programs, and no others", () => {
    const expected = (Object.keys(DISCIPLINES) as (keyof typeof DISCIPLINES)[]).filter(
      (d) => DISCIPLINES[d].implemented && ALL_PROGRAMS.some((p) => p.discipline === d)
    )
    expect([...OFFERED_DISCIPLINES].sort()).toEqual([...expected].sort())
  })

  it("the Half Ironman is reachable — it is the one that was not", () => {
    // Named, because a derived list that happened to be wrong would still pass
    // the shape tests above.
    const halfIronman = ALL_PROGRAMS.find((p) => /half ironman/i.test(p.name))
    expect(halfIronman, "premise: the Half Ironman is still in the catalogue").toBeDefined()
    expect(OFFERED_DISCIPLINES).toContain(halfIronman!.discipline)
  })

  it("no screen spells the catalogue's size as a word", () => {
    // "Thirteen cited programs" was right when it was written and wrong the
    // moment a fourteenth was added — which is what a hand-counted number does.
    const projectRoot = path.resolve(__dirname, "../../..")
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
