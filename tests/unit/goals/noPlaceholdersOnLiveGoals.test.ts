/**
 * NO LIVE GOALS SCREEN SHIPS A NOTE TO SELF.
 *
 * THE DEFECT THIS FORBIDS. `GoalsHubContent` rendered an orange panel reading
 * "PLACEHOLDER" in 3xl bold, with "Streak system overhaul coming" under it. It
 * was unconditional, it was committed on 2026-05-31, and `GoalsHubContent` is
 * embedded in Life Mastery's Track step — so every time the owner opened the
 * step his plan exists to feed, that is what he saw above his goals.
 *
 * It survived four months and two audits. It was reported to him on the first
 * day of this work and still not removed a week later, because every check
 * after that was a unit test or a database query rather than the screen. The
 * one time the page text WAS read, only the first thirty lines were taken, and
 * the fourteen-step rail fills all of them — so the answer came back "no
 * placeholder on screen" while it sat a few lines further down.
 *
 * That is the failure this file exists to make impossible to repeat: a string
 * check is cheap, and a screen nobody opens is the only place a defect like
 * this can live.
 *
 * SCOPE. Live goal surfaces only. Everything under `app/test/` is a bench and
 * 404s in production, and a bench is exactly where an unfinished idea belongs.
 */

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const projectRoot = path.resolve(__dirname, "../../..")

/**
 * The goal surfaces a signed-in person can actually reach, and the components
 * they pull in. Named rather than globbed: a glob over `src/goals` would sweep
 * in the nine generations of bench screens and the list would stop meaning
 * anything.
 */
const LIVE_SURFACES = [
  "src/goals/components/GoalsHubContent.tsx",
  "src/goals/components/GoalCard.tsx",
  "src/goals/components/DailyActionView.tsx",
  "src/goals/components/GoalHierarchyView.tsx",
  "src/goals/components/GoalFormModal.tsx",
  "src/goals/components/GoalFormVariant6.tsx",
  "src/goals/components/ProjectionTimeline.tsx",
  "src/goals/components/TodaysPulse.tsx",
  "src/goals/components/north-star/TrackTab.tsx",
  "src/goals/components/north-star/TodayTab.tsx",
  "src/goals/components/north-star/GoalCard.tsx",
  "src/goals/components/north-star/NorthStarFlow.tsx",
]

/** What an unfinished idea looks like when it reaches a user. */
const NOTES_TO_SELF = [
  /\bPLACEHOLDER\b/,
  /\bTBD\b/,
  /\bcoming soon\b/i,
  /\bnot implemented\b/i,
  /\bwork in progress\b/i,
]

/** Rendered text only: a comment saying "placeholder" is documentation. */
function renderedText(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    // `placeholder={...}` on an input is the HTML attribute, not a note.
    .replace(/placeholder=\{[^}]*\}/gi, "")
    .replace(/placeholder="[^"]*"/gi, "")
}

describe("live goal screens", () => {
  it("every file in the list exists — a renamed file must not drop off silently", () => {
    const missing = LIVE_SURFACES.filter((f) => !fs.existsSync(path.join(projectRoot, f)))
    expect(missing, `Listed but not on disk:\n${missing.join("\n")}`).toEqual([])
  })

  it("none of them renders a note to self", () => {
    const found: string[] = []
    for (const file of LIVE_SURFACES) {
      const text = renderedText(fs.readFileSync(path.join(projectRoot, file), "utf-8"))
      for (const pattern of NOTES_TO_SELF) {
        const hit = pattern.exec(text)
        if (hit) found.push(`${file}: ${hit[0]}`)
      }
    }

    expect(
      found,
      "These are on a screen a signed-in person can reach:\n" + found.join("\n"),
    ).toEqual([])
  })

  it("the check reads rendered text, so a green result means something", () => {
    // Not vacuous: it must catch the exact block that shipped, and must not
    // catch the two things that legitimately contain the word.
    expect(NOTES_TO_SELF.some((p) => p.test(renderedText('<span>PLACEHOLDER</span>')))).toBe(true)
    expect(NOTES_TO_SELF.some((p) => p.test(renderedText('<p>Streak system overhaul coming soon</p>')))).toBe(true)
    expect(NOTES_TO_SELF.some((p) => p.test(renderedText('// PLACEHOLDER: finish this')))).toBe(false)
    expect(NOTES_TO_SELF.some((p) => p.test(renderedText('<input placeholder="e.g. coming soon" />')))).toBe(false)
    expect(LIVE_SURFACES.length).toBeGreaterThan(8)
  })
})
