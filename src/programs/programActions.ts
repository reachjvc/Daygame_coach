/**
 * EVERY BUTTON THAT CHANGES A PROGRAM, IN ONE PLACE.
 *
 * Five buttons in the gym screens change a program on the server: End, Skip,
 * Reset, Restart and Remove. Four of them used to be written like this:
 *
 *     await fetch(`/api/programs/enrollments/${id}`, { method: "DELETE" })
 *     onUnenrolled()
 *
 * No look at the answer. So a refusal ("finish the workout you have open
 * first") and a success were the same thing to the screen: it navigated away
 * from a program that was still running and still prescribing sessions, and the
 * next screen showed it running, which reads as the app having forgotten.
 *
 * Phase 1 gave the server real refusals to send — one workout open on a
 * program now stops it being ended — so "did not look at the answer" changed
 * from a latent bug into a visible one. Hence one module: every call does the
 * fetch, looks at the answer, reads the server's own sentence out of it, and
 * hands back one of two shapes. Nothing here navigates, refreshes or shows
 * anything; the screen decides that, because the screens do it differently and
 * the decision is theirs.
 *
 * `tests/unit/architecture.test.ts` fails if any other file under `src/` or
 * `components/` fetches these routes, so a screen added later cannot quietly go
 * back to not looking. ProgressionView is replaced by the program sheet in a
 * later phase — the rule living in a module rather than in that component is
 * what makes it survive the replacement.
 */

/**
 * What every action answers with.
 *
 * `error` is always a sentence fit to put on screen, never a code — the screens
 * show it as written.
 */
export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

/**
 * The sentence for a fetch that never arrived. It says what is true of all five
 * actions when the request itself fails: the server was not reached, so nothing
 * on it changed.
 */
export const UNREACHABLE = "Could not reach the server, so nothing was changed."

/**
 * One request, one answer.
 *
 * A body that is not JSON is not an error in itself — a 204 has none — so the
 * parse failure only matters when the response was a refusal, and then the
 * fallback sentence stands in for the one the server did not send.
 */
async function call<T>(url: string, init: RequestInit, whenSilent: string): Promise<ActionResult<T>> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    return { ok: false, error: UNREACHABLE }
  }
  const body = (await res.json().catch(() => null)) as ({ error?: string } & T) | null
  if (!res.ok) return { ok: false, error: body?.error ?? whenSilent }
  return { ok: true, data: (body ?? null) as T }
}

/** Stops a program prescribing sessions. Everything it logged is kept. */
export function endProgram(id: string): Promise<ActionResult<{ displaced?: unknown }>> {
  return call(`/api/programs/enrollments/${id}`, { method: "DELETE" }, "That program was not ended.")
}

/** Moves the program on a session without logging one. */
export function skipSession(id: string): Promise<ActionResult> {
  return post(id, "skip", "That session was not skipped.")
}

/** Throws the program back to the beginning of its schedule. */
export function resetProgram(id: string): Promise<ActionResult> {
  return post(id, "reset", "The program was not reset.")
}

function post(id: string, action: "skip" | "reset", whenSilent: string): Promise<ActionResult> {
  return call(
    `/api/programs/enrollments/${id}/action`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
    whenSilent
  )
}

/**
 * Puts a finished program back on, keeping the weights it had worked up to.
 * `displaced` names whatever it pushed aside, so the screen can say so rather
 * than letting somebody discover it later.
 */
export function restartProgram(
  id: string
): Promise<ActionResult<{ displaced?: { program_id: string }[] }>> {
  return call(
    `/api/programs/enrollments/${id}/resume`,
    { method: "POST" },
    "Could not restart that program."
  )
}

/**
 * Removes a finished program from the list. The sessions it logged stay in
 * history — what goes is the link between them and the program.
 */
export function deletePastProgram(id: string): Promise<ActionResult> {
  return call(
    `/api/programs/enrollments/${id}?permanent=1`,
    { method: "DELETE" },
    "That program could not be removed."
  )
}
