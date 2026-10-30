/**
 * The page's calls to /api/thoughts/*. Thin on purpose: every rule lives in
 * the service, the repo or the hook. A failed call throws `ThoughtsCallError`
 * with the server's sentence (written for a person) and whether a retry could
 * help: offline and 5xx can; a 4xx never will.
 */

import type { Reframe, ThoughtSettings, ThoughtsView, LogInput } from "./types"
import type { ReframeInput } from "./thoughtsService"

export class ThoughtsCallError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly body: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      cache: "no-store",
    })
  } catch {
    throw new ThoughtsCallError("No connection", 0, true)
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const message = typeof body.error === "string" ? body.error : "Something went wrong"
    throw new ThoughtsCallError(message, res.status, res.status >= 500 || res.status === 408 || res.status === 429, body)
  }
  return body as T
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const thoughtsApi = {
  view: () => call<ThoughtsView>("/api/thoughts"),
  create: (id: string, text: string) => call<{ id: string; created: boolean }>("/api/thoughts", json("POST", { id, text })),
  update: (id: string, patch: { text?: string; pinned?: boolean; archived?: boolean }) =>
    call<{ ok: true }>(`/api/thoughts/${id}`, json("PATCH", patch)),
  remove: (id: string) => call<{ ok: true }>(`/api/thoughts/${id}`, { method: "DELETE" }),
  merge: (id: string, into: string) => call<{ ok: true }>(`/api/thoughts/${id}/merge`, json("POST", { into })),
  reframes: (id: string) => call<{ reframes: Reframe[] }>(`/api/thoughts/${id}/reframes`),
  log: (logs: LogInput[]) =>
    call<{ stored: number; dropped: number; refused: { id: unknown; error: string }[] }>("/api/thoughts/logs", json("POST", { logs })),
  undo: (logId: string) => call<{ ok: true }>(`/api/thoughts/logs/${logId}`, { method: "DELETE" }),
  saveReframe: (input: ReframeInput) => call<{ reframe: Reframe }>("/api/thoughts/reframes", json("PUT", input)),
  saveSettings: (settings: ThoughtSettings) =>
    call<{ settings: ThoughtSettings; nextDueAt: string | null }>("/api/thoughts/settings", json("PUT", settings)),
}
