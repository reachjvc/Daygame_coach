// @vitest-environment node
/**
 * A backup you cannot restore is not a backup.
 *
 * The round trip against a real database is proved by hand (the procedure is in
 * docs/runbooks/timetrack.md, and it was run: an entry was created, backed up,
 * genuinely deleted, and recovered). These cover the part that decides whether
 * a file is safe to restore at all — the check that stands between a good file
 * and a half-written one being written over live data.
 */

import { describe, expect, test } from "vitest"

import { assertRestorable } from "@/src/db/timetrackBackupRepo"
import { TIMETRACK_TABLES } from "@/src/db/timetrackTypes"

function goodBackup() {
  const tables: Record<string, unknown[]> = {}
  for (const table of TIMETRACK_TABLES) tables[table] = []
  return {
    format: "daygame-timetrack-backup" as const,
    version: 1 as const,
    takenAt: "2026-09-08T10:00:00.000Z",
    userId: null,
    counts: {},
    tables,
  }
}

describe("deciding whether a file is safe to restore", () => {
  test("a good backup passes", () => {
    expect(() => assertRestorable(goodBackup())).not.toThrow()
  })

  test("some other JSON file is refused by name", () => {
    expect(() => assertRestorable({ hello: "world" })).toThrow(/not a timetrack backup/)
  })

  test("a backup from a future version is refused rather than half-understood", () => {
    expect(() => assertRestorable({ ...goodBackup(), version: 2 })).toThrow(/version 2/)
  })

  test("a backup missing a table is refused — restoring it would lose that table", () => {
    const missing = goodBackup()
    delete (missing.tables as Record<string, unknown>).timetrack_entries
    expect(() => assertRestorable(missing)).toThrow(/missing the timetrack_entries table/)
  })

  test("a truncated file, where a table is not even a list, is refused", () => {
    const broken = goodBackup()
    ;(broken.tables as Record<string, unknown>).timetrack_projects = "oops"
    expect(() => assertRestorable(broken)).toThrow(/missing the timetrack_projects table/)
  })

  test("nothing at all is refused, rather than treated as an empty backup", () => {
    expect(() => assertRestorable(null)).toThrow()
    expect(() => assertRestorable(undefined)).toThrow()
  })

  test("every table the app has is required, so a new one cannot be silently skipped", () => {
    for (const table of TIMETRACK_TABLES) {
      const missing = goodBackup()
      delete (missing.tables as Record<string, unknown>)[table]
      expect(() => assertRestorable(missing), `${table} was not checked`).toThrow()
    }
  })
})
