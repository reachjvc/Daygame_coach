/**
 * The audit page's calls to /api/audit/*. Thin on purpose: the rules live in
 * the services and the routes. A failed call throws `AuditCallError` with the
 * server's sentence (written for a person) and whether a retry could help:
 * offline and 5xx can; a 4xx never will (401 aside: see offlineQueue).
 *
 * Every call names the account the page was opened for, so a tab left open
 * while someone else signs in cannot save into their account (requireAuth).
 */

import { PAGE_ACCOUNT_HEADER } from "@/src/shared/pageAccount"
import type { ActivityCount } from "./suggestService"
import type { AnswerMark, AuditAnswer, AuditRun, AuditSlot, TimeEntryForAudit } from "./types"
import type { MuteOption, ReviewChange } from "./auditService"

export class AuditCallError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message)
  }
}

export interface AuditView {
  run: AuditRun | null
  runs: AuditRun[]
  slots: AuditSlot[]
  timeEntries: TimeEntryForAudit[]
  suggestions: ActivityCount[]
  timezone: string
  now: string
}

export function auditApi(account: string) {
  async function call<T>(url: string, init?: RequestInit): Promise<T> {
    let res: Response
    try {
      res = await fetch(url, {
        ...init,
        headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), [PAGE_ACCOUNT_HEADER]: account },
        cache: "no-store",
      })
    } catch {
      throw new AuditCallError("No connection", 0, true)
    }
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      const message = typeof body.error === "string" ? body.error : "Something went wrong"
      // 409 is "this page was opened for another account" (requireAuth): the
      // answers waiting here are the page's account's, so they are kept, never
      // dropped as if the server had refused them for good.
      throw new AuditCallError(message, res.status, res.status >= 500 || res.status === 408 || res.status === 409 || res.status === 429)
    }
    return body as T
  }
  const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

  return {
    view: (runId?: string) => call<AuditView>(runId ? `/api/audit?run=${encodeURIComponent(runId)}` : "/api/audit"),
    start: (id: string) => call<{ run: AuditRun }>("/api/audit/runs", json("POST", { id })),
    end: (runId: string) => call<{ run: AuditRun }>(`/api/audit/runs/${runId}`, json("PATCH", { end: true })),
    /** `shown`: the end the tapped tile showed, stored when it was right a moment ago (muteEnd). */
    mute: (runId: string, mute: MuteOption, shown?: string) =>
      call<{ run: AuditRun }>(`/api/audit/runs/${runId}`, json("PATCH", shown ? { mute, shown } : { mute })),
    quiet: (runId: string, quietStart: number, quietEnd: number) =>
      call<{ run: AuditRun }>(`/api/audit/runs/${runId}`, json("PATCH", { quietStart, quietEnd })),
    /** One choice, note or block, applied to the review as stored: another device's saves stay. */
    changeReview: (runId: string, reviewChange: ReviewChange) => call<{ run: AuditRun }>(`/api/audit/runs/${runId}`, json("PATCH", { reviewChange })),
    save: (slots: AuditAnswer[]) =>
      call<{ stored: number; refused?: { id: unknown; error: string; retry: boolean; stored?: AnswerMark | null }[] }>(
        "/api/audit/slots",
        json("PUT", { slots, sentAt: new Date().toISOString() }),
      ),
    /** The account's time zone, as chosen in Settings (the same route Settings uses). */
    zone: (timezone: string) => call<{ timezone: string }>("/api/settings/time-preferences", json("PUT", { timezone, source: "chosen" })),
    /**
     * Delete one answer. `seen`: the answer as this device drew it; the server
     * deletes only that, and names what it holds instead (`changed`) when
     * another device changed it since (alpha prove-audit-03). All of it goes
     * in the body: an address ends up in logs and history, and the answer is
     * his own words (review of 81f325e9).
     */
    remove: (id: string, at?: string, seen?: AnswerMark) =>
      call<{ ok: true; deleted?: boolean; changed?: AnswerMark }>(
        `/api/audit/slots/${id}`,
        json("DELETE", { ...(at ? { at, sentAt: new Date().toISOString() } : {}), ...(seen ? { seen } : {}) }),
      ),
  }
}

export type AuditApi = ReturnType<typeof auditApi>
