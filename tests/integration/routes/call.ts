/**
 * CALL A ROUTE HANDLER THE WAY NEXT DOES, AGAINST THE TEST BACKEND.
 *
 * The files beside this one were browser tests that only ever made requests —
 * a page opened so `fetch` had a cookie to send, then nothing on screen read.
 * Here the same handler from `app/api/**` is called with a `Request`, and
 * `requireAuth` finds the user through `@/src/db/supabase`, which each file
 * swaps for the harness's (tests/db/harness.ts):
 *
 *   vi.mock("@/src/db/supabase", async (importOriginal) =>
 *     (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal()))
 *
 * So the route, its repo and the database's own rules run unchanged, as the
 * user the test made with `newUser()` and handed to `actAs()`.
 */

/** Any `app/api` handler. A method signature, so a handler with fewer or narrower parameters still fits. */
type Handler = {
  handle(request: Request, context: { params: Promise<Record<string, string>> }): Promise<Response>
}["handle"]

export interface Answer<T = unknown> {
  status: number
  body: T
}

export async function call<T = Record<string, unknown>>(
  handler: Handler,
  path: string,
  { method = "GET", body, params = {} }: { method?: string; body?: unknown; params?: Record<string, string> } = {}
): Promise<Answer<T>> {
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body)
    init.headers = { "Content-Type": "application/json" }
  }
  const response = await handler(new Request(`http://test.local${path}`, init), { params: Promise.resolve(params) })
  const text = await response.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error(`${method} ${path} answered ${response.status} with a body that is not JSON: ${text.slice(0, 200)}`)
    }
  }
  return { status: response.status, body: parsed as T }
}
