"use client"

/**
 * THE SAVED WEEKS, AND EVERY REQUEST THAT TOUCHES ONE.
 *
 * Here rather than in the screen because `tests/unit/architecture.test.ts`
 * fails any file under `components/` containing `fetch(` that is not on an
 * allowlist this phase may not grow — and the reason for that rule is what this
 * feature has already been caught by twice: a screen that fetches for itself is
 * a screen whose loading, failed and empty states are three lines apart from
 * the data, and the failed one ends up rendering as the empty one.
 *
 * EVERY CALL RETURNS WHAT WENT WRONG RATHER THAN THROWING. A saved week is
 * somebody's training written down; "Save" doing nothing, with the reason in a
 * console nobody has open, is the failure this whole slice keeps being rebuilt
 * over. The screen shows the sentence the server sent.
 */

import { useCallback, useEffect, useState } from "react"
import type { DraftResult, DraftWrite, DraftsState, ProgramDraft, StartWrite } from "../types"

const DRAFTS = "/api/programs/drafts"

/**
 * The reply, read once and in one place.
 *
 * A FAILED REQUEST IS NOT AN EMPTY BODY. `res.json()` on a 500 with an HTML
 * error page throws, and the throw used to surface as "Failed to fetch" — a
 * sentence about the network for a problem that was not the network.
 */
async function send<T>(url: string, init: RequestInit): Promise<DraftResult<T>> {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    })
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    if (!res.ok) {
      if (res.status === 401) return { ok: false, error: "Sign in to save a week." }
      return { ok: false, error: body?.error ?? "That could not be saved." }
    }
    return { ok: true, value: body as T }
  } catch {
    // The one case that really is the network.
    return { ok: false, error: "That did not reach the server. Your week is still here." }
  }
}

export function useProgramDrafts(): DraftsState {
  const [drafts, setDrafts] = useState<ProgramDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const out = await send<ProgramDraft[]>(DRAFTS, { method: "GET" })
    if (out.ok && Array.isArray(out.value)) {
      setDrafts(out.value)
      setError(null)
    } else {
      /**
       * THE LIST IS LEFT ALONE, and the failure is recorded — the same rule
       * `useActiveEnrollments` holds. Emptying it turns "we could not ask" into
       * "you have saved nothing", and a screen that says that about somebody's
       * written training weeks is a screen that has lost them.
       */
      setError(out.ok ? "Your saved weeks could not be read." : out.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** Re-read the list after a write that changed it, and pass the result on. */
  const after = useCallback(
    async <T,>(pending: Promise<DraftResult<T>>): Promise<DraftResult<T>> => {
      const result = await pending
      if (result.ok) await refresh()
      return result
    },
    [refresh]
  )

  return {
    drafts,
    loading,
    error,
    refresh,
    startCustomWeek: useCallback(
      (body: StartWrite) =>
        send<{ enrollment: { id: string } }>("/api/programs/enrollments", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      []
    ),
    saveDraft: useCallback(
      (body: DraftWrite) =>
        after(send<ProgramDraft>(DRAFTS, { method: "POST", body: JSON.stringify(body) })),
      [after]
    ),
    updateDraft: useCallback(
      (id: string, body: DraftWrite) =>
        after(send<ProgramDraft>(`${DRAFTS}/${id}`, { method: "PATCH", body: JSON.stringify(body) })),
      [after]
    ),
    startDraft: useCallback(
      (id: string) =>
        after(
          send<{ enrollment: { id: string } }>(`${DRAFTS}/${id}/start`, {
            method: "POST",
            body: JSON.stringify({}),
          })
        ),
      [after]
    ),
    deleteDraft: useCallback(
      (id: string) => after(send<{ ok: true }>(`${DRAFTS}/${id}`, { method: "DELETE" })),
      [after]
    ),
  }
}
