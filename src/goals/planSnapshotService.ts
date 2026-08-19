/**
 * What a snapshot request is allowed to be.
 *
 * The write route is unauthenticated — the flow it serves is a test page with
 * no login — so every field is checked here before it reaches the database.
 * The size cap is the important one: without it, one `fetch` in a loop fills
 * the table with whatever anybody likes.
 */

/** Roughly a plan with 200 goals on it. Real ones run about 20 KB. */
export const MAX_SNAPSHOT_BYTES = 256 * 1024

/** A browser id is a UUID we minted. Anything else is somebody poking at it. */
const CLIENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface SnapshotRequest {
  clientId: string
  plan: { areas?: unknown[]; goals?: unknown[] }
  planText: string
}

export function parseSnapshotRequest(body: unknown): { ok: true; value: SnapshotRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be an object" }
  const b = body as Record<string, unknown>

  if (typeof b.clientId !== "string" || !CLIENT_ID.test(b.clientId)) {
    return { ok: false, error: "clientId must be a UUID" }
  }
  if (!b.plan || typeof b.plan !== "object") return { ok: false, error: "plan is required" }

  const size = JSON.stringify(b.plan).length
  if (size > MAX_SNAPSHOT_BYTES) return { ok: false, error: `plan is ${size} bytes, over the ${MAX_SNAPSHOT_BYTES} limit` }

  const plan = b.plan as { areas?: unknown[]; goals?: unknown[] }
  if (!Array.isArray(plan.goals) || !Array.isArray(plan.areas)) {
    return { ok: false, error: "plan must have areas and goals" }
  }

  return {
    ok: true,
    value: {
      clientId: b.clientId,
      plan,
      // Truncated rather than rejected: the text is a convenience copy of the
      // JSON, and losing the tail of it is not worth failing a whole write.
      planText: typeof b.planText === "string" ? b.planText.slice(0, 100_000) : "",
    },
  }
}
