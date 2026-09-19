/**
 * NOTHING NAMES A PROGRAM YOU ARE RUNNING FROM THE CATALOGUE SHELL.
 *
 * Every week somebody writes themselves is stored as `program_id: "custom"`,
 * and the catalogue entry behind that id is a single shared shell whose name
 * is the string "Your own program". So four surfaces — the live workout
 * header, the two "this was paused" lists, and the goals planner — resolved
 * the name with `getProgram(id)?.name` and printed "Your own program" for
 * every self-built week at once, including the one you had carefully named.
 *
 * `enrollmentName` has existed since the drafts work and reads the label off
 * the enrollment, falling back to the catalogue and then to the raw id. Three
 * surfaces used it; four did not.
 *
 * The check below is a floor, not a proof: it fails on the shape of the
 * mistake rather than on its meaning. `tests/unit/programs/enrollmentName.test.ts`
 * covers what the function itself answers.
 */

import { describe, test, expect } from "vitest"
import fs from "fs"
import path from "path"

const projectRoot = path.resolve(__dirname, "../../..")

/** The one file allowed to read a name off a catalogue entry. */
const THE_CATALOGUE = "src/programs/data/catalog.ts"

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue
      out.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

describe("what a running program is called", () => {
  test("nothing reads a program's name out of the catalogue to label an enrollment", () => {
    const offenders: string[] = []

    for (const dir of ["src", "app", "components"]) {
      for (const file of sourceFiles(path.join(projectRoot, dir))) {
        const rel = path.relative(projectRoot, file).replace(/\\/g, "/")
        if (rel === THE_CATALOGUE) continue

        const code = fs
          .readFileSync(file, "utf-8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "")

        code.split("\n").forEach((line, i) => {
          // `getProgram(x)?.name`, `requireProgram(x).name`, `programFor(x).name`
          if (/\b(getProgram|requireProgram|programFor)\s*\([^)]*\)\s*\??\.name\b/.test(line)) {
            offenders.push(`${rel}:${i + 1} — ${line.trim().slice(0, 100)}`)
          }
        })
      }
    }

    expect(
      offenders,
      "These name a program from the catalogue entry. For a week somebody\n" +
        'wrote themselves that entry is the shared shell called "Your own\n' +
        "program\". Use `enrollmentName(enrollment)`:\n" +
        offenders.join("\n")
    ).toEqual([])
  })

  test("the four surfaces that used to get it wrong now use enrollmentName", () => {
    // Named rather than counted: a count stays right while one of them is
    // rewritten back to the old way.
    const surfaces = [
      "app/programs/live/page.tsx",
      "src/goals/components/north-star/WorkoutPrograms.tsx",
      "src/programs/components/PastPrograms.tsx",
    ]
    const missing = surfaces.filter(
      (rel) => !fs.readFileSync(path.join(projectRoot, rel), "utf-8").includes("enrollmentName")
    )
    expect(
      missing,
      "These show the name of a program somebody is running and no longer\n" +
        "use enrollmentName:\n" +
        missing.join("\n")
    ).toEqual([])
  })
})
