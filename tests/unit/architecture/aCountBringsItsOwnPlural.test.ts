/**
 * "1 entries" NEVER REACHES THE SCREEN.
 *
 * Round 12 found `Imported 1 entries` in a browser and it was fixed with `plural()`.
 * Round 13's browser round found three MORE, all live on screen and all in files that
 * already import `plural` and use it elsewhere:
 *
 *   Settings → Integrations   "uploaded file · 1 events · synced 2026-09-27 12:00"
 *   Manage → Tags             "used on 1 entries"
 *   Projects → dashboard      "recurring weekly · 1 days remaining"
 *
 * Two rounds, four instances, one helper that was right there. Fixing the instance is
 * what let the second round find three more, so this is the check instead.
 *
 * WHAT IT CATCHES: a count expression immediately followed by a bare plural noun, in
 * JSX text or a template literal. WHAT IT CANNOT: a noun not in `PLURALS`, a count that
 * does not look like one, and the genuinely irregular ("1 people"). It is a net for the
 * shape that has actually happened here four times, not a grammar checker.
 */

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vitest"

const SCOPE = join(process.cwd(), "src/timetrack")

/** The nouns this slice counts. A new one gets added the first time it is counted. */
const PLURALS = [
  "entries",
  "events",
  "days",
  "hours",
  "minutes",
  "seconds",
  "weeks",
  "months",
  "members",
  "projects",
  "tasks",
  "tags",
  "clients",
  "groups",
  "calendars",
  "reports",
  "rules",
  "webhooks",
  "favorites",
  "blocks",
]

/**
 * An expression that could be 1. A literal or an all-caps constant could not — a
 * window of `${CALENDAR_WINDOW_DAYS_BACK} days back` is fixed at 90 and reads fine.
 */
function couldBeOne(expression: string): boolean {
  const text = expression.trim()
  if (/^\d+$/.test(text)) return false
  if (/^[A-Z][A-Z0-9_]*$/.test(text)) return false
  if (text.includes("plural(")) return false
  return true
}

/**
 * A developer never reads "1 entries" and winces. `reportError` text goes to the error
 * log, not to a screen, and pluralising it would only make the tripwire message longer.
 */
function isForADeveloper(source: string, at: number): boolean {
  const before = source.slice(Math.max(0, at - 400), at)
  return /reportError\(\s*(new Error\()?[^)]*$/.test(before) || /new Error\([^)]*$/.test(before)
}

function files(): { file: string; source: string }[] {
  const out: { file: string; source: string }[] = []
  const walk = (dir: string) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, item.name)
      if (item.isDirectory()) walk(path)
      else if (/\.tsx?$/.test(item.name)) out.push({ file: path.slice(SCOPE.length + 1), source: readFileSync(path, "utf8") })
    }
  }
  walk(SCOPE)
  return out
}

describe("a count shown to a person", () => {
  const sources = files()

  test("there are files to scan, so the rest of this asserts something", () => {
    expect(sources.length, "nothing found under src/timetrack — has it moved?").toBeGreaterThan(10)
  })

  test("never sits in front of a bare plural noun", () => {
    const nouns = PLURALS.join("|")
    // `{expr} entries` in JSX text, and `${expr} entries` in a template literal
    const pattern = new RegExp(`\\$?\\{([^{}]{1,120}?)\\}[ \\t]+(${nouns})\\b`, "g")

    const offenders = sources.flatMap(({ file, source }) =>
      [...source.matchAll(pattern)]
        .filter((match) => couldBeOne(match[1]) && !isForADeveloper(source, match.index ?? 0))
        .map((match) => `${file}:${source.slice(0, match.index).split("\n").length}  ${match[0].replace(/\s+/g, " ")}`),
    )

    expect(
      offenders,
      'Use `plural(n, "entry", "entries")` — these read "1 entries" when the count is 1:\n  ' + offenders.join("\n  "),
    ).toEqual([])
  })

  test("and the scan would catch the four that reached the screen", () => {
    /**
     * The exact strings from rounds 12 and 13, checked against the pattern rather than
     * against the fixed files — so this cannot pass merely because they are fixed.
     */
    const nouns = PLURALS.join("|")
    const pattern = new RegExp(`\\$?\\{([^{}]{1,120}?)\\}[ \\t]+(${nouns})\\b`)
    const historical = [
      "`Imported ${result.imported} entries`",
      "· {calendar.eventCount} events",
      "used on {tagUsageCount(state, tag.id)} entries",
      "{periodDaysRemaining(dashboard, todayKey)} days remaining",
    ]
    const missed = historical.filter((line) => {
      const match = pattern.exec(line)
      return !match || !couldBeOne(match[1])
    })
    expect(missed, "the scan does not catch these, so it would not have caught them").toEqual([])
  })

  test("and does not flag a fixed constant or an already-pluralised count", () => {
    const nouns = PLURALS.join("|")
    const pattern = new RegExp(`\\$?\\{([^{}]{1,120}?)\\}[ \\t]+(${nouns})\\b`)
    for (const line of [
      "`${CALENDAR_WINDOW_DAYS_BACK} days back`",
      "`${90} days forward`",
      '{plural(calendar.eventCount, "event")} synced',
    ]) {
      const match = pattern.exec(line)
      expect(match === null || !couldBeOne(match[1]), `wrongly flagged: ${line}`).toBe(true)
    }
  })
})
