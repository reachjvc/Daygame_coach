/**
 * THE TIME TRACKER SHOWS TIMES THE WAY ITS OWN SETTINGS SAY TO.
 *
 * Settings › Profile offers a Date format and a Time format, and the lists and
 * reports honour both. Four places did not: they called `toLocaleString` and
 * friends, which follow the BROWSER's locale, so the entry detail sheet printed
 * "last updated 9/26/2026, 9:39:19 PM" on a profile set to YYYY-MM-DD and
 * 24-hour — a setting contradicted two lines from where it is offered.
 *
 * `timetrackFormatService` has `formatDate` and `formatTimeOfDay`, which take
 * those settings. This keeps the slice using them.
 *
 * SCOPED TO THIS SLICE ON PURPOSE. There are around 130 `toLocale*` calls
 * elsewhere in the repo; those screens have no user-facing format setting to
 * contradict, so a repo-wide ban would be a rule nobody asked for. If another
 * slice grows one, it can copy this file.
 *
 * WHAT IT DOES NOT CATCH: a caller that uses the right helper and passes the
 * wrong setting, or one that formats a date by hand with `getFullYear()`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vitest"

const SLICE = "src/timetrack"
/** Where the formatting itself is implemented, and may call the platform. */
const OWNER = "timetrackFormatService.ts"
const BANNED = /\.toLocale(String|DateString|TimeString)\s*\(/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

describe("dates and times come from the settings, not from the browser", () => {
  test("no file in the slice formats a date or time with toLocale*", () => {
    const offenders = sourceFiles(SLICE)
      .filter((file) => !file.endsWith(OWNER))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .map((line, i) => ({ line, n: i + 1 }))
          .filter(({ line }) => BANNED.test(line) && !line.trim().startsWith("*"))
          .map(({ n }) => `${file}:${n}`),
      )

    expect(offenders).toEqual([])
  })

  test("the pattern it bans is a pattern it can see", () => {
    // the guard that never fires is the guard nobody notices is broken
    expect(BANNED.test('const x = new Date(entry.at).toLocaleString()')).toBe(true)
    expect(BANNED.test('const x = new Date(nowSec * 1000).toLocaleTimeString()')).toBe(true)
    expect(BANNED.test('formatTimeOfDay(entry.at, state.user.timeFormat)')).toBe(false)
  })
})
