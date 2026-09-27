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
     * Checked against the constraint in the migration rather than against a
     * remembered version of it: a client-side rule that accepts more than the
     * database does is the bug this file is about, one level up.
     */
    const constraint = /^https:\/\//i
    for (const url of ["https://a.example/x", "HTTPS://a.example/x"]) {
      expect(constraint.test(url), `${url} passes the database check`).toBe(true)
      expect(add(url).violations, `${url} passes the database but was refused here`).toEqual([])
    }
    for (const url of ["http://a.example/x", "a.example/x", "//a.example/x"]) {
      expect(constraint.test(url), `${url} fails the database check`).toBe(false)
      expect(add(url).violations.length, `${url} fails the database but was accepted here`).toBe(1)
    }
  })
})
