import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * DOES THIS SERVER REACH ITS DATABASE? Asked by `/api/healthz` only.
 *
 * Not the health-tracking feature: that is `healthRepo.ts` and `app/api/health/`.
 * A repo like the others, because all database access goes through
 * `src/db/*Repo.ts`. It builds its own cookie-free anon client on purpose: a
 * health check must not depend on, or refresh, anybody's session.
 *
 * The question is answered with the cheapest real query there is: a HEAD
 * request for one row of `values`, a public catalogue that the anon role may
 * read (its policy is "Public read access", and the anon role holds SELECT).
 * No session, no user data, no body comes back. It proves PostgREST and
 * Postgres both answer, which is what a deploy needs to know before it keeps a
 * new image.
 *
 * Two limits, because the endpoint is public and unauthenticated:
 *   - 2 s: a database that takes longer is down as far as a visitor can tell,
 *     and a health check that hangs holds up the deploy that is waiting on it.
 *   - 10 s cache: however often `/api/healthz` is called, the database is asked
 *     at most once per 10 s per server. Callers that arrive while a probe is
 *     running share it. Failures are cached too, or a dead database would be
 *     asked on every request.
 */

export const PROBE_TIMEOUT_MS = 2_000
export const PROBE_CACHE_MS = 10_000

type Probe = (signal: AbortSignal) => Promise<void>

let anonClient: SupabaseClient | null = null

async function headOneValue(signal: AbortSignal): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase is not configured")
  anonClient ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await anonClient
    .from("values")
    .select("id", { head: true })
    .limit(1)
    .abortSignal(signal)
  if (error) throw new Error(error.message)
}

async function answersInTime(probe: Probe): Promise<boolean> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<false>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve(false)
    }, PROBE_TIMEOUT_MS)
  })
  try {
    return await Promise.race([
      probe(controller.signal).then(
        () => true,
        () => false,
      ),
      timedOut,
    ])
  } finally {
    clearTimeout(timer)
  }
}

let cached: { at: number; answer: Promise<boolean> } | null = null

/** True when the database answered a query within 2 s, at most 10 s ago. */
export function databaseAnswers(probe: Probe = headOneValue, now: number = Date.now()): Promise<boolean> {
  if (cached && now - cached.at < PROBE_CACHE_MS) return cached.answer
  const answer = answersInTime(probe)
  cached = { at: now, answer }
  return answer
}

/** Tests only: forget the cached answer. */
export function forgetReadiness(): void {
  cached = null
}
