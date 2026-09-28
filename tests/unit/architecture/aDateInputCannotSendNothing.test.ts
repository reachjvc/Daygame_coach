/**
 * NOTHING HANDS `dateKey` SOMETHING THAT IS NOT A DATE.
 *
 * `dateKey` throws rather than returning the string `"NaN-NaN-NaN"`, which is right —
 * a value shaped like a date key but holding NaN reaches a Postgres `date` column and
 * looks like data all the way down. But a throw is only right if nothing legitimate
 * can reach it, and when that throw was added a comment in `timetrackFormatService.ts`
 * claimed the premise was "enforced rather than asserted" by a test at THIS PATH — and
 * the file did not exist. The only occurrence of its name in the repository was the
 * comment claiming it existed. A false claim of coverage is worse than none, because
 * it stops the next person looking.
 *
 * So here it is, and it guards the two things the premise actually needs:
 *
 *   1. every `type="date"` in the slice deals with an empty value, because an empty
 *      `<input type="date">` fires `change` with `""`;
 *   2. every writer of a `DateRange` produces keys that parse — which is the half the
 *      comment got wrong. The live bug was NOT at an input: `decodeReportConfig` cast
 *      any JSON to a `ReportConfig`, so a share link could put empty strings in the
 *      range, and `shiftRange` then reached the throw inside a click handler where
 *      nothing catches it. The arrow silently did nothing.
 *
 * Read from the SOURCE for (1) rather than by rendering, for the reason
 * `touchTargetsAtSource.test.ts` gives: a rendered sweep sees the screens somebody
 * thought to render, and the source sees all of them.
 */

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vitest"

import {
  applyFilters,
  buildDetailed,
  buildProfitability,
  buildSummary,
  buildWorkload,
  decodeReportConfig,
  defaultReportConfig,
  emptyFilters,
  presetRange,
  describeReport,
  rangeDayCount,
} from "@/src/timetrack/reportsService"
import { addDays, dateKey, weekStartOf } from "@/src/timetrack/timetrackFormatService"

import { baseState } from "../timetrack/helpers"

const COMPONENTS = join(process.cwd(), "src/timetrack/components")

/**
 * Every `type="date"` in the slice, as its WHOLE element.
 *
 * Sliced by element boundary rather than by a character window. The first version of
 * this read `type="date"` up to 900 characters forward, and one of the three inputs in
 * `ProjectsView` is longer than that once its comment is counted — so the scan found
 * two of three and quietly did not cover the very input this file was written for. A
 * scan's enumeration IS its claim, and a length limit is an enumeration nobody stated.
 */
function dateInputs(): { file: string; snippet: string }[] {
  const found: { file: string; snippet: string }[] = []
  for (const file of readdirSync(COMPONENTS).filter((f) => f.endsWith(".tsx"))) {
    const source = readFileSync(join(COMPONENTS, file), "utf8")
    // `<Input …/>` and `<input …/>`, whole, however long
    for (const match of source.matchAll(/<[Ii]nput\b[\s\S]*?\/>/g)) {
      if (match[0].includes('type="date"')) found.push({ file, snippet: match[0] })
    }
  }
  return found
}

describe("every date input in the tracker", () => {
  const inputs = dateInputs()

  test("there are some, so the rest of this asserts something", () => {
    expect(inputs.length, "no `type=\"date\"` was found — has the regex or the folder moved?").toBeGreaterThan(5)
  })

  test("each one deals with being cleared", () => {
    /**
     * Three shapes count, and each is honest about what it does with the clear:
     *   `value && setX(value)`  — ignore it (a range with no dates has no meaning)
     *   `value || null`         — store nothing (a nullable column)
     *   `if (!value) return`    — ignore it, spelled out
     * Anything else hands `""` onward, and `""` reaches `dateKey`.
     */
    const unguarded = inputs
      .filter(({ snippet }) => {
        const handler = /onChange=\{[\s\S]*$/.exec(snippet)?.[0] ?? ""
        if (!handler) return false // no handler at all cannot send anything
        return !(
          /\.value\s*&&/.test(handler) ||
          /\.value\s*\|\|\s*null/.test(handler) ||
          /if\s*\(!\s*\w+(\.\w+)*\.value\s*\)\s*return/.test(handler)
        )
      })
      .map(({ file, snippet }) => `${file}: ${(/aria-label="([^"]+)"|label="([^"]+)"/.exec(snippet)?.[0] ?? snippet.slice(0, 60)).trim()}`)

    expect(
      unguarded,
      "these date inputs pass an empty string onward, and `dateKey` throws on it:\n  " + unguarded.join("\n  "),
    ).toEqual([])
  })

  test("and a controlled date input does not show a value its state does not hold", () => {
    /**
     * The companion mistake, made once: a handler storing `null` next to a
     * `value={x ?? todayKey}` re-renders as TODAY, so clearing the box put the date
     * back on screen while the draft held nothing — and Create was then refused for a
     * missing date the field appeared to have.
     */
    const lying = inputs
      .filter(({ snippet }) => /value=\{[^}]*\?\?\s*(todayKey|dateKey|new Date)/.test(snippet))
      .map(({ file, snippet }) => `${file}: ${/value=\{[^}]*\}/.exec(snippet)?.[0] ?? ""}`)

    expect(
      lying,
      "these fall back to a real date when their state is empty, so clearing them shows a date that is not held:\n  " +
        lying.join("\n  "),
    ).toEqual([])
  })
})

describe("every writer of a report's date range", () => {
  const state = baseState()
  const NOW_SEC = Math.floor(new Date(2026, 8, 28, 12).getTime() / 1000)

  /**
   * The half the original comment missed. `dateKey` is reached from `addDays` and
   * `weekStartOf`, and the report range is what feeds them — so a range is only safe
   * if everything that can produce one produces parseable keys.
   */
  /**
   * Asserted on the RESULT, not on the absence of a throw. The repo's
   * `assertionQuality` ratchet is right that a bare throw assertion says almost
   * nothing, and "it came back as a date key" is the thing actually wanted here.
   *
   * (That ratchet counts occurrences in comments as well as in code, which is how the
   * first version of this note pushed the count over the budget by describing the
   * thing it was avoiding.)
   */
  const KEY = /^\d{4}-\d{2}-\d{2}$/

  test("a preset range is two keys that parse, and both can be shifted", () => {
    for (const preset of ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year"] as const) {
      const range = presetRange(preset, "2026-09-28", 1)
      expect(range.start, `${preset} produced ${range.start}`).toMatch(KEY)
      expect(range.end, `${preset} produced ${range.end}`).toMatch(KEY)
      // the two helpers that reach `dateKey`, which is what the ‹ › arrows call
      expect(addDays(range.start, rangeDayCount(range)), `${preset} cannot be shifted`).toMatch(KEY)
      expect(weekStartOf(range.end, 1)).toMatch(KEY)
      expect(dateKey(new Date(range.start))).toMatch(KEY)
    }
  })

  test("an empty filter set's range can be shifted too", () => {
    const filters = emptyFilters(presetRange("this_week", "2026-09-28", 1))
    expect(addDays(filters.range.start, 7)).toMatch(KEY)
  })

  /**
   * A SHARE LINK EITHER IS NOT A CONFIG, OR COMES BACK AS A WHOLE ONE.
   *
   * Two wrong versions of this before it settled. The first cast any JSON to a
   * `ReportConfig`, so `?report=e30` — `btoa("{}")` — reached the builders and, because
   * `ReportsView` builds all four in a `useMemo` and the `ErrorBoundary` wraps the whole
   * of `<main>`, replaced the timer and every other screen with "Something went wrong".
   * The second validated `filters.range` because that was the crash in front of it, and
   * a link carrying only a range still threw on `filters.description.trim()`.
   *
   * So the contract is not "refuse the bad ones" — a validator is one field short every
   * round. It is: anything that is not an object is refused, and anything that is comes
   * back laid over a complete default. The assertion is therefore that every link
   * produces something all four builders can use, which is the thing actually promised.
   */
  const DEFAULTS = defaultReportConfig("2026-09-28", 1, { enabled: false, mode: "nearest", minutes: 15 })
  const encode = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value))))

  test("what is not an object at all is refused", () => {
    for (const bad of [[], 7, "text", null]) {
      expect(decodeReportConfig(encode(bad), DEFAULTS), `${JSON.stringify(bad)} was accepted`).toBeNull()
    }
    expect(decodeReportConfig("!!!not-base64!!!", DEFAULTS)).toBeNull()
  })

  test("no field of a link can be null, wrong-typed or unknown and still reach a builder", () => {
    /**
     * DERIVED FROM THE KEY SET, BECAUSE A HAND-WRITTEN LIST WAS ONE FIELD SHORT THREE
     * TIMES RUNNING.
     *
     * The first attempt cast any JSON to a config. The second checked `filters.range`,
     * the crash in front of it. The third spread the link over a default and its comment
     * claimed "a merge cannot have that failure for any input" — but JSON carries `null`
     * and `null` wins a spread, so eight one-field links still replaced the timer, the
     * entry list and every other screen with "Something went wrong". Every one of the
     * three came with a test whose examples were all well-typed omissions, which is the
     * exact space the bug was not in.
     *
     * So this enumerates `Object.keys` of the default instead: for every field, a link
     * carrying `null` and a link carrying a wrong-typed value must both come back with
     * a usable config. The next field added to `ReportConfig` is covered the day it is
     * added.
     */
    const wrongTyped = [null, 42, "a string", [], {}, true]
    const failures: string[] = []

    const check = (label: string, link: unknown) => {
      const cfg = decodeReportConfig(encode(link), DEFAULTS)
      if (cfg === null) return // refusing is a fine answer
      // unknown keys must not survive: they get persisted by Save and re-shared
      const extra = Object.keys(cfg).filter((k) => !(k in DEFAULTS))
      if (extra.length > 0) failures.push(`${label}: kept unknown key(s) ${extra.join(", ")}`)
      try {
        buildSummary(state, cfg, NOW_SEC)
        buildDetailed(state, cfg, NOW_SEC)
        buildWorkload(state, cfg, NOW_SEC)
        buildProfitability(state, cfg, NOW_SEC)
        applyFilters(state, cfg.filters)
        describeReport(cfg)
      } catch (error) {
        failures.push(`${label}: ${(error as Error).message.slice(0, 70)}`)
      }
    }

    for (const key of Object.keys(DEFAULTS)) {
      for (const value of wrongTyped) check(`${key} = ${JSON.stringify(value)}`, { [key]: value })
    }
    for (const key of Object.keys(DEFAULTS.filters)) {
      for (const value of wrongTyped) check(`filters.${key} = ${JSON.stringify(value)}`, { filters: { [key]: value } })
    }
    check("an unknown key", { evil: 1 })
    check("everything at once", {
      ...Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, null])),
      filters: Object.fromEntries(Object.keys(DEFAULTS.filters).map((k) => [k, null])),
    })

    expect(failures.slice(0, 10), `${failures.length} link(s) produced an unusable config:\n  ${failures.join("\n  ")}`).toEqual([])
  })

  test("and every partial link comes back complete, range included", () => {
    for (const partial of [
      {},
      { filters: {} },
      { filters: { range: {} } },
      { filters: { range: { start: "", end: "" } } },
      { filters: { range: { start: "not-a-date", end: "2026-09-28" } } },
      { filters: { range: { start: "2026-13-45", end: "2026-09-28" } } },
      { grouping: "tag" },
      { filters: emptyFilters(presetRange("this_month", "2026-09-28", 1)), grouping: "project" },
    ]) {
      const decoded = decodeReportConfig(encode(partial), DEFAULTS)
      expect(decoded, `${JSON.stringify(partial)} was refused`).not.toBeNull()
      const cfg = decoded!
      // every key present, so nothing downstream can read undefined
      expect(Object.keys(cfg).sort(), `${JSON.stringify(partial)} is missing keys`).toEqual(Object.keys(DEFAULTS).sort())
      expect(Object.keys(cfg.filters).sort()).toEqual(Object.keys(DEFAULTS.filters).sort())
      // and the range is one the arrows can shift, which is what reaches `dateKey`
      expect(addDays(cfg.filters.range.start, rangeDayCount(cfg.filters.range))).toMatch(KEY)
    }
  })
})
