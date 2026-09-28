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

import { decodeReportConfig, emptyFilters, presetRange, rangeDayCount } from "@/src/timetrack/reportsService"
import { addDays, dateKey, weekStartOf } from "@/src/timetrack/timetrackFormatService"

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

  test("a share link that would produce an unusable range is refused", () => {
    /**
     * `?report=e30` is `btoa("{}")`. It used to decode to `{}`, and every report
     * builder then threw inside a render. A range of empty strings decoded happily and
     * reached the ‹ › arrows, where the throw goes to `window.onerror` and the button
     * silently does nothing.
     */
    const encode = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    for (const bad of [
      {},
      [],
      7,
      { filters: {} },
      { filters: { range: {} } },
      { filters: { range: { start: "", end: "" } } },
      { filters: { range: { start: "not-a-date", end: "2026-09-28" } } },
      { filters: { range: { start: "2026-13-45", end: "2026-09-28" } } },
    ]) {
      expect(decodeReportConfig(encode(bad)), `${JSON.stringify(bad)} was accepted`).toBeNull()
    }
  })

  test("and a real one still round-trips", () => {
    const good = { filters: emptyFilters(presetRange("this_month", "2026-09-28", 1)), grouping: "project" }
    const encode = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    expect(decodeReportConfig(encode(good))).not.toBeNull()
  })
})
