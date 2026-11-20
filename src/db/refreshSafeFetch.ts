/**
 * Kept apart from authResilience.ts, with no imports, because the browser
 * client (supabase-client.ts) uses it: importing authResilience there pulled
 * supabase-js's error helpers into every page that loads the browser client.
 * Why the wrapper exists: authResilience.ts, point 2.
 */

/** A token refresh: the one auth call whose failure makes supabase-js delete the session. */
function isTokenRefresh(input: RequestInfo | URL, init?: RequestInit): boolean {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase()
  if (method !== "POST") return false
  try {
    const parsed = new URL(url)
    return parsed.pathname.endsWith("/auth/v1/token") && parsed.searchParams.get("grant_type") === "refresh_token"
  } catch {
    return false
  }
}

/**
 * Wraps a fetch so a token refresh answered with a server fault or a rate
 * limit reaches supabase-js as a 503, which it retries and never treats as a
 * sign-out. Every other request, and every other answer, passes untouched.
 */
export function refreshSafeFetch(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await inner(input, init)
    if (!isTokenRefresh(input, init)) return response
    if (response.status === 502 || response.status === 503 || response.status === 504) return response
    // The auth server answers every refusal in JSON. A 4xx that is not JSON came
    // from something in front of it (a Cloudflare block page), and a 408 is "not
    // now": neither says anything about the session (adversarial review, finding 1).
    const json = (response.headers.get("content-type") ?? "").includes("application/json")
    const fault = response.status >= 500 || response.status === 429 || response.status === 408 || (response.status >= 400 && !json)
    if (!fault) return response
    // the original body is not read; let its connection go
    await response.body?.cancel().catch(() => {})
    return new Response(JSON.stringify({ code: "service_unavailable", msg: "The sign-in service could not be reached" }), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "content-type": "application/json" },
    })
  }
}
