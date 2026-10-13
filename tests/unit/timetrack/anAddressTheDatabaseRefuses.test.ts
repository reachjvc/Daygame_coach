/**
 * A VALUE THE DATABASE WILL REFUSE IS REFUSED WHERE IT IS TYPED.
 *
 * `timetrack_webhooks` carries `check (url ~* '^https://')` and nothing checked
 * before the row was queued. So a typed `http://` was accepted, sent, and refused
 * — every time, for ever.
 *
 * And the damage does not stop at the webhook. `pushTimetrackRows` writes the
 * tables in order and a refusal stops the rest, and `timetrack_webhooks` is
 * written before the webhook log, the autotracker rules, the timeline, the
 * calendars and `timetrack_settings`. `timetrack_settings` is where the person's
 * name, members, groups, pomodoro, idle and reminder preferences live. One
 * missing "s" and none of it syncs again.
 *
 * The same class is still open elsewhere in this schema — the recurring-project
 * shape, the timeline ordering, the alert threshold range, the not-blank names —
 * and the order test in `tests/unit/db` is what makes the consequence visible.
 */

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vitest"

import { createEmptyWorkspace } from "@/src/timetrack/data/emptyWorkspace"
import { addWebhook } from "@/src/timetrack/timetrackService"
import type { WebhookEventName } from "@/src/timetrack/types"

const NOW = "2026-09-20T10:00:00.000Z"
const EVENTS = ["time_entry.created"] as WebhookEventName[]

const add = (url: string) => addWebhook(createEmptyWorkspace(NOW), url, EVENTS)

describe("adding a webhook", () => {
  test("takes an https address", () => {
    const result = add("https://example.com/hook")
    expect(result.violations).toEqual([])
    expect(result.state.webhooks).toHaveLength(1)
    expect(result.state.webhooks[0].url).toBe("https://example.com/hook")
  })

  test("refuses an http one, and says why it matters", () => {
    const result = add("http://example.com/hook")
    expect(result.state.webhooks, "the row was queued and will be refused for ever").toHaveLength(0)
    expect(result.violations[0].message).toContain("https://")
  })

  test("refuses an address with no scheme at all", () => {
    const result = add("example.com/hook")
    expect(result.state.webhooks).toHaveLength(0)
    expect(result.violations).toHaveLength(1)
  })

  test.each(["", "   ", "https://", "ftp://example.com", "javascript:alert(1)"])("refuses %o", (url) => {
    expect(add(url).state.webhooks).toHaveLength(0)
  })

  test("trims what was typed, so a trailing space is not part of the address", () => {
    const result = add("  https://example.com/hook  ")
    expect(result.state.webhooks[0].url).toBe("https://example.com/hook")
  })

  test("the pattern is the database's own, not a looser copy of it", () => {
    /**
     * Checked against the constraint as the migrations state it, not against a
     * remembered copy: a client-side rule that accepts more than the database does
     * is the bug this file is about, one level up. The client may be stricter (it
     * refuses a bare `https://`); it may never be looser.
     */
    const database = webhookUrlCheck()
    const wellFormed = ["https://a.example/x", "HTTPS://a.example/x", "  https://a.example/x  "]
    const malformed = ["http://a.example/x", "a.example/x", "//a.example/x", "ftp://a.example/x", "https:/a.example/x", " http://a.example"]

    const refusedByDatabase = [...wellFormed, ...malformed].filter((url) => !database.test(url.trim()))
    expect(refusedByDatabase, "the parsed check refuses none of these, so it was misread").toEqual(
      expect.arrayContaining(["http://a.example/x"]),
    )
    for (const url of refusedByDatabase) {
      expect(add(url).violations.length, `${JSON.stringify(url)} fails the database's check but was accepted here`).toBe(1)
    }
    for (const url of wellFormed) {
      expect(database.test(url.trim()), `${JSON.stringify(url)} should pass the database's check`).toBe(true)
      expect(add(url).violations, `${JSON.stringify(url)} passes the database but was refused here`).toEqual([])
    }
  })
})

/**
 * `timetrack_webhooks_url_is_https` as the NEWEST migration that names it states it.
 * If a later migration drops or rewrites it in a shape this cannot read, that is a
 * failure here rather than a silent fall-back to the first definition.
 */
function webhookUrlCheck(): RegExp {
  const dir = join(process.cwd(), "supabase/migrations")
  let last: { file: string; text: string } | null = null
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(dir, file), "utf8")
    for (const m of sql.matchAll(/timetrack_webhooks_url_is_https\b([^;]*)/gi)) last = { file, text: m[1] }
  }
  if (!last) throw new Error("no migration names timetrack_webhooks_url_is_https, so this would assert nothing")
  const pattern = /^\s*check\s*\(\s*url\s*~\*\s*'([^']*)'\s*\)/i.exec(last.text)?.[1]
  if (pattern === undefined) {
    throw new Error(`${last.file} is the last to name the webhook URL check, and not as \`check (url ~* '…')\`: ${last.text.trim()}`)
  }
  // `~*` is Postgres's case-insensitive match
  return new RegExp(pattern, "i")
}
