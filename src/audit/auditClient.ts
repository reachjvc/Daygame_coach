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
import type { AuditAnswer, AuditRun, AuditSlot, Review, TimeEntryForAudit } from "./types"
import type { MuteOption } from "./auditService"

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
      throw new AuditCallError(message, res.status, res.status >= 500 || res.status === 408 || res.status === 429)
    }
    return body as T
  }
  const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

  return {
    view: (runId?: string) => call<AuditView>(runId ? `/api/audit?run=${encodeURIComponent(runId)}` : "/api/audit"),
    start: (id: string) => call<{ run: AuditRun }>("/api/audit/runs", json("POST", { id })),
    end: (runId: string) => call<{ run: AuditRun }>(`/api/audit/runs/${runId}`, json("PATCH", { end: true })),
    mute: (runId: string, mute: MuteOption) => call<{ run: AuditRun }>(`/api/audit/runs/${runId}`, json("PATCH", { mute })),
    quiet: (runId: string, quietStart: number, quietEnd: number) =>
      call<{ run: AuditRun }>(`/api/audit/runs/${runId}`, json("PATCH", { quietStart, quietEnd })),
    review: (runId: string, review: Review) => call<{ run: AuditRun }>(`/api/audit/runs/${runId}`, json("PATCH", { review })),
    save: (slots: AuditAnswer[]) => call<{ stored: number }>("/api/audit/slots", json("PUT", { slots })),
    remove: (id: string) => call<{ ok: true }>(`/api/audit/slots/${id}`, { method: "DELETE" }),
  }
}

export type AuditApi = ReturnType<typeof auditApi>
