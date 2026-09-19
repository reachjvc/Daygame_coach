/**
 * ONE WAY TO RECORD A WORKOUT.
 *
 * There were three, and they disagreed. The live screen ticked sets as you did
 * them. "I did all of this — save it" wrote a whole session at its prescribed
 * numbers in one tap, including rows whose prescription is a range. And a form
 * on the fourth tab took kilograms in a box labelled by nothing, had its own
 * 90-day "New PR" rule, and posted to a third endpoint that wrote the workout
 * row before its sets — so a refused set left an empty session counting
 * towards the streak.
 *
 * Both after-the-fact forms are gone, with their two save paths. What is left
 * is start → tick → finish, whether you are in the gym or writing up Tuesday
 * on Thursday.
 *
 * THIS FILE IS A RATCHET, not a description. Each test fails if a second way
 * comes back, and every path it names was verified present before it was
 * removed — a guard written against something that was never there passes for
 * ever and protects nothing.
 */

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const root = path.resolve(__dirname, "../../..")

/** Every .ts/.tsx under src/ and app/, as [relative path, source]. */
function sources(): [string, string][] {
  const out: [string, string][] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue
        walk(full)
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push([path.relative(root, full), fs.readFileSync(full, "utf-8")])
      }
    }
  }
  walk(path.join(root, "src"))
  walk(path.join(root, "app"))
  return out
}

/** Comments blanked: this file's own explanations name what it forbids. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("the two deleted save paths stay deleted", () => {
  it("nothing posts a whole session to /api/programs/enrollments/*/log", () => {
    const guilty = sources().filter(
      ([, s]) => /enrollments\/\$\{[^}]+\}\/log["`']/.test(code(s))
    )
    expect(guilty.map(([f]) => f)).toEqual([])
  })

  it("the log route itself is gone, and its sibling DELETE is not", () => {
    expect(fs.existsSync(path.join(root, "app/api/programs/enrollments/[id]/log/route.ts"))).toBe(false)
    // Five browser-test cleanups delete a session through this one.
    expect(
      fs.existsSync(path.join(root, "app/api/programs/enrollments/[id]/log/[logId]/route.ts"))
    ).toBe(true)
  })

  it("/api/health/workout exports GET and DELETE and no POST", () => {
    const route = code(fs.readFileSync(path.join(root, "app/api/health/workout/route.ts"), "utf-8"))
    expect(route).toContain("export async function GET")
    expect(route).toContain("export async function DELETE")
    expect(route, "a whole workout in one call is the path that is gone").not.toContain(
      "export async function POST"
    )
  })

  it("nothing in the app posts to /api/health/workout", () => {
    // A GET with a query string and a DELETE with ?id= both mention the path,
    // so the method is what this looks at.
    const guilty = sources().filter(([, s]) => {
      const c = code(s)
      const i = c.indexOf('"/api/health/workout"')
      if (i === -1) return false
      return /method:\s*"POST"/.test(c.slice(i, i + 400))
    })
    expect(guilty.map(([f]) => f)).toEqual([])
  })
})

describe("the two forms are gone", () => {
  it("TodaySessionWidget, RestTimer and WorkoutLogger do not exist", () => {
    for (const f of [
      "src/programs/components/TodaySessionWidget.tsx",
      "src/programs/components/RestTimer.tsx",
      "src/health/components/WorkoutLogger.tsx",
    ]) {
      expect(fs.existsSync(path.join(root, f)), f).toBe(false)
    }
  })

  it("no screen offers a one-tap 'save it all' or a day-typed-in-a-box", () => {
    /**
     * The exact words the deleted forms used. "Did the N fixed sets as shown"
     * is the replacement and is deliberately not on this list: it ticks only
     * rows with one definite prescription, and only in past mode.
     */
    const banned = [
      "I did all of this",
      "Did it exactly as shown",
      "Day (blank = today)",
      "Log a workout you already did",
    ]
    const guilty: string[] = []
    for (const [file, src] of sources()) {
      const c = code(src)
      for (const phrase of banned) if (c.includes(phrase)) guilty.push(`${file}: ${phrase}`)
    }
    expect(guilty).toEqual([])
  })
})

describe("starting an empty workout has one home", () => {
  it("<StartLooseWorkout appears exactly once in src/, in ProgramsApp", () => {
    const mounts = sources().filter(([, s]) => code(s).includes("<StartLooseWorkout"))
    expect(mounts.map(([f]) => f)).toEqual(["src/programs/components/ProgramsApp.tsx"])
    // Once in that file too: it was rendered in two branches, and the walk
    // found three of these buttons across two tabs.
    const [, src] = mounts[0]
    expect(code(src).split("<StartLooseWorkout").length - 1).toBe(1)
  })

  it("the training screen has three tabs and none of them is 'Anything else'", () => {
    const screen = code(
      fs.readFileSync(path.join(root, "src/programs/components/TrainingScreen.tsx"), "utf-8")
    )
    expect(screen).not.toContain("Anything else")
    expect(screen).not.toContain('"anything"')
    const labels = [...screen.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1])
    expect(labels).toEqual(["Today", "History", "Progress"])
  })
})
