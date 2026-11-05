// @vitest-environment node
/**
 * EVERY MIGRATION HAS A VERSION OF ITS OWN.
 *
 * Supabase records a migration as applied by the number before the first "_".
 * Found 2026-11-05: the running-timer notification and a life-plan change were
 * written on separate branches as `20261104160000_…`; the life-plan one was
 * applied to production first, and `db push` would then have taken the
 * notification as applied too and skipped it, while the site's code read its
 * new column. A rollback file shares its migration's version, so it is checked
 * the same way in its own folder.
 */
import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(__dirname, "../../..")

function versions(dir: string): Map<string, string[]> {
  const byVersion = new Map<string, string[]>()
  for (const file of fs.readdirSync(path.join(ROOT, dir))) {
    if (!file.endsWith(".sql")) continue
    const version = file.split("_")[0]
    byVersion.set(version, [...(byVersion.get(version) ?? []), file])
  }
  return byVersion
}

describe("migration versions", () => {
  it.each(["supabase/migrations", "supabase/migrations/rollback"])("are unique in %s", (dir) => {
    const shared = [...versions(dir).values()].filter((files) => files.length > 1)
    expect(shared).toEqual([])
  })
})
