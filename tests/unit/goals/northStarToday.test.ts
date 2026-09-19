/**
 * WHOSE TODAY, IN LIFE MASTERY.
 *
 * `todayISO()` is the BROWSER's day. Every tick on the Track step is filed
 * against it — while the ticks derived from finished workouts arrive on the
 * ACCOUNT's local date. On a phone in a different zone from the account, a
 * session you did on Monday ticked Tuesday's column, or the other way round,
 * with nothing on screen to explain it.
 *
 * The flow now takes the account's zone from the server and computes today
 * from it. The bare calls that remain are the fallback for the single render
 * before the effect runs, which is a different thing and reads as one:
 * `today ?? ns.todayISO()`.
 */

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const projectRoot = path.resolve(__dirname, "../../..")
const FLOW_DIR = "src/goals/components/north-star"

/**
 * The one component outside the flow that still reads the browser's day.
 *
 * `SeasonBand` is mounted by the tracking dashboard (`ProgressDashboard.tsx`),
 * not by Life Mastery, and takes no props — so it has no account zone to read.
 * Held at exactly one here, and named, rather than left to spread: giving it
 * the zone means threading it through that dashboard's own page, which is a
 * different surface and a different change.
 */
const BROWSER_TODAY_DEBT: Record<string, number> = {
  "SeasonBand.tsx": 1,
}

function bareTodayCalls(): Record<string, number> {
  const dir = path.join(projectRoot, FLOW_DIR)
  const found: Record<string, number> = {}
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue
    const code = fs
      .readFileSync(path.join(dir, entry.name), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      // The fallback for the render before the effect is not a decision about
      // whose day it is — it is one frame of the account's day not being known.
      .replace(/today\s*\?\?\s*(ns\.)?todayISO\(\)/g, "")
    const hits = code.match(/\btodayISO\(\)/g)
    if (hits) found[entry.name] = hits.length
  }
  return found
}

describe("Life Mastery reads today from the account, not the browser", () => {
  it("no component in the flow decides today from the browser clock", () => {
    const found = bareTodayCalls()
    const offenders = Object.entries(found)
      .filter(([file, n]) => n > (BROWSER_TODAY_DEBT[file] ?? 0))
      .map(([file, n]) => `${file}: ${n}, allowed ${BROWSER_TODAY_DEBT[file] ?? 0}`)

    expect(
      offenders,
      "These decide what day it is from the phone. The account's day comes\n" +
        "from `timezone` via getTodayInTimezone, and is handed down as `today`:\n" +
        offenders.join("\n")
    ).toEqual([])
  })

  it("the browser-clock allowance only shrinks", () => {
    const found = bareTodayCalls()
    const cleaned = Object.entries(BROWSER_TODAY_DEBT)
      .filter(([file, n]) => (found[file] ?? 0) < n)
      .map(([file, n]) => `${file}: now ${found[file] ?? 0}, allowance still ${n}`)

    expect(
      cleaned,
      "Fixed — lower these in BROWSER_TODAY_DEBT so they cannot come back:\n" + cleaned.join("\n")
    ).toEqual([])
  })

  it("the flow takes a timezone and uses it to work out today", () => {
    const flow = fs.readFileSync(path.join(projectRoot, FLOW_DIR, "NorthStarFlow.tsx"), "utf-8")
    expect(flow).toContain("timezone")
    expect(flow).toContain("getTodayInTimezone(timezone)")
  })

  it("the page reads the account's zone and hands it over", () => {
    const page = fs.readFileSync(path.join(projectRoot, "app/life-mastery/page.tsx"), "utf-8")
    expect(page).toContain("getUserTimezone")
    expect(page).toContain("timezone={timezone}")
  })
})
