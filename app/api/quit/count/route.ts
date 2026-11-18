import { COUNT_MAX_BYTES, parseCount } from "@/src/quit/countValidate"

/**
 * Counts a step of a quit tool. Until Phase 8 adds the table this validates and
 * stores nothing. No cookies, no IP, no logging of the body.
 */
export async function POST(request: Request) {
  // Only a JSON body, and only from this site: a page elsewhere cannot send a plain form-style POST here.
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase()
  if (type !== "application/json") return new Response(null, { status: 415 })
  const origin = request.headers.get("origin")
  if (origin !== null && origin !== new URL(request.url).origin) return new Response(null, { status: 403 })

  const declared = Number(request.headers.get("content-length") ?? "0")
  if (declared > COUNT_MAX_BYTES) return new Response(null, { status: 413 })

  const text = await request.text()
  if (new TextEncoder().encode(text).length > COUNT_MAX_BYTES) return new Response(null, { status: 413 })

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return new Response(null, { status: 400 })
  }
  if (!parseCount(body)) return new Response(null, { status: 400 })
  return new Response(null, { status: 204 })
}
